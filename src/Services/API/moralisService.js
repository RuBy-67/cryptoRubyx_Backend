const { Moralis, EvmChain, SUPPORTED_CHAINS, initializeMoralis, isInitialized } = require('../../config/moralis');
const db = require('../../database');
const tokenBanService = require('../tokenBanService');

class MoralisService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    async ensureInitialized() {
        if (!isInitialized) {
            await initializeMoralis();
        }
    }

    getCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        return null;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    async getWalletData(address, chain = 'ETHEREUM') {
        try {
            // Vérifier le cache
            const cacheKey = `wallet_${address}_${chain}`;
            const cachedData = this.getCache(cacheKey);
            if (cachedData) {
                return cachedData;
            }

            await this.ensureInitialized();

            const chainConfig = SUPPORTED_CHAINS[chain];
            if (!chainConfig) {
                throw new Error(`Chaîne non supportée: ${chain}`);
            }

            // Utiliser la méthode spécifique pour Solana
            if (chain === 'SOLANA') {
                return await this.getSolanaWalletData(address);
            }

            // Récupérer toutes les données en parallèle
            const [nativeBalance, tokenBalances, nfts] = await Promise.all([
                Moralis.EvmApi.balance.getNativeBalance({
                    address,
                    chain: chainConfig.chain
                }),
                Moralis.EvmApi.token.getWalletTokenBalances({
                    address,
                    chain: chainConfig.chain
                }),
                Moralis.EvmApi.nft.getWalletNFTs({
                    address,
                    chain: chainConfig.chain
                })
            ]);

            const tokenBalancesData = tokenBalances.toJSON();
            const nftsData = nfts.toJSON();
            const formattedNfts = Array.isArray(nftsData) ? nftsData : nftsData.result || [];

            // Récupérer les floor prices des collections de NFTs
            const uniqueCollections = [...new Set(formattedNfts.map(nft => nft.token_address))];
            
            // Récupérer le prix du token natif avant la boucle
            let nativeTokenPrice = null;
            try {
                const nativePrice = await Moralis.EvmApi.token.getTokenPrice({
                    address: chainConfig.nativeTokenAddress,
                    chain: chainConfig.chain
                });
                nativeTokenPrice = nativePrice.toJSON();
            } catch (error) {
                console.error(`Erreur lors de la récupération du prix du token natif:`, error);
            }

            const nftPricesPromises = uniqueCollections.map(async (contractAddress) => {
                try {
                    const salePrices = await Moralis.EvmApi.nft.getNFTContractSalePrices({
                        address: contractAddress,
                        chain: chainConfig.chain
                    });
                    const salePricesData = salePrices.toJSON();

                    // Utiliser les données directement depuis la réponse
                    const lowestSale = salePricesData.lowest_sale;
                    const averageSale = salePricesData.average_sale;
                    const lastSale = salePricesData.last_sale;

                    // Convertir les prix en ETH
                    const floorPrice = lowestSale ? Number(lowestSale.price) / Math.pow(10, 18) : 0;
                    const avgPrice = averageSale ? Number(averageSale.price) / Math.pow(10, 18) : 0;
                    const lastSalePrice = lastSale ? Number(lastSale.price) / Math.pow(10, 18) : 0;

                    // Convertir en USD
                    const floorPriceUsd = lowestSale ? Number(lowestSale.current_usd_value) : 0;
                    const avgPriceUsd = averageSale ? Number(averageSale.current_usd_value) : 0;
                    const lastSalePriceUsd = lastSale ? Number(lastSale.current_usd_value) : 0;

                  
                    return [contractAddress, {
                        floorPrice,
                        floorPriceUsd,
                        avgPrice,
                        avgPriceUsd,
                        lastSale: lastSale ? {
                            price: lastSalePrice,
                            priceUsd: lastSalePriceUsd,
                            timestamp: lastSale.block_timestamp,
                            from: lastSale.from_address,
                            to: lastSale.to_address,
                            transactionHash: lastSale.transaction_hash,
                            marketplace: lastSale.marketplace
                        } : null,
                        totalTrades: salePricesData.total_trades,
                        openseaUrl: `https://opensea.io/assets/ethereum/${contractAddress}`
                    }];
                } catch (error) {
                    console.error(`Erreur détaillée pour ${contractAddress}:`, {
                        error: error.message,
                        code: error.code,
                        details: error.details
                    });
                    return [contractAddress, { 
                        floorPrice: 0, 
                        floorPriceUsd: 0,
                        avgPrice: 0,
                        avgPriceUsd: 0,
                        lastSale: null
                    }];
                }
            });

            const collectionStatsMap = new Map(await Promise.all(nftPricesPromises));
           

            // Récupérer les métadonnées des tokens en une seule fois
            const tokenAddresses = tokenBalancesData.map(token => token.token_address);
            let tokenMetadata = [];
            
            // Ne récupérer les métadonnées que s'il y a des tokens
            if (tokenAddresses.length > 0) {
                tokenMetadata = await Moralis.EvmApi.token.getTokenMetadata({
                addresses: tokenAddresses,
                chain: chainConfig.chain
            });
            }

            const tokenMetadataMap = new Map(
                (tokenMetadata && typeof tokenMetadata.toJSON === 'function' 
                    ? tokenMetadata.toJSON() 
                    : []
                ).map(metadata => [metadata.address, metadata])
            );

            // Récupérer les prix des tokens en une seule fois
            const tokenPricesPromises = tokenAddresses.length > 0 
                ? tokenAddresses.map(async (tokenAddress) => {
                try {
                    const price = await Moralis.EvmApi.token.getTokenPrice({
                        address: tokenAddress,
                        chain: chainConfig.chain
                    });
                    return [tokenAddress, price.toJSON()];
                } catch (error) {
                    console.error(`Erreur lors de la récupération du prix pour ${tokenAddress}:`, error);
                        // Renvoyer un objet avec des valeurs par défaut en cas d'erreur
                        return [tokenAddress, {
                            usdPrice: 0,
                            usdPrice24hChange: 0,
                            usdMarketCap: 0,
                            usdVolume24h: 0,
                            lastUpdated: new Date().toISOString()
                        }];
                    }
                })
                : [];

            const tokenPricesMap = new Map(await Promise.all(tokenPricesPromises));

            // Formater les données des tokens avec les métadonnées et les prix
            const formattedTokens = tokenBalancesData.map(token => {
                const metadata = tokenMetadataMap.get(token.token_address) || {};
                const priceData = tokenPricesMap.get(token.token_address);
                
                const marketData = {
                    price: priceData?.usdPrice || 0,
                    percent_change_24h: priceData?.usdPrice24hrPercentChange || 0,
                    usd_change_24h: priceData?.usdPrice24hrUsdChange || 0,
                    market_cap: priceData?.usdMarketCap || 0,
                    volume_24h: priceData?.usdVolume24h || 0,
                    last_updated: priceData?.lastUpdated || new Date().toISOString()
                };
                
                
                
                return {
                    type: 'ERC20',
                    address: token.token_address,
                    name: metadata.name || token.name,
                    symbol: metadata.symbol || token.symbol,
                    decimals: metadata.decimals || token.decimals,
                    balance: token.balance,
                    totalSupply: metadata.total_supply,
                    owner: metadata.owner_of,
                    blockNumber: metadata.block_number,
                    lastUpdated: new Date().toISOString(),
                    marketData
                };
            });

            // Modifier le formattage des NFTs pour inclure les prix
            const formattedNftsData = formattedNfts.map(nft => {
                const collectionStats = collectionStatsMap.get(nft.token_address) || { 
                    floorPrice: 0, 
                    floorPriceUsd: 0,
                    lastSale: null,
                    openseaUrl: `https://opensea.io/assets/ethereum/${nft.token_address}`
                };
                return {
                type: 'NFT',
                contractAddress: nft.token_address,
                tokenId: nft.token_id,
                name: nft.name,
                symbol: nft.symbol,
                owner: address,
                lastTransfer: {
                    from: nft.owner_of,
                    to: address,
                    timestamp: nft.block_timestamp,
                    hash: nft.block_hash
                },
                    metadata: nft.metadata,
                    floorPrice: collectionStats.floorPrice,
                    floorPriceUsd: collectionStats.floorPriceUsd,
                    lastSale: collectionStats.lastSale,
                    openseaUrl: collectionStats.openseaUrl
                };
            });

            // Calculer la valeur totale des NFTs
            const totalNftValue = formattedNftsData.reduce((total, nft) => total + nft.floorPriceUsd, 0);

            // Ajouter un token virtuel pour représenter la valeur totale des NFTs
            const nftToken = {
                type: 'NFT_COLLECTION',
                symbol: 'NFTs',
                name: 'NFT Collection',
                balance: formattedNftsData.length,
                address: 'virtual_nft_token',
                decimals: 0,
                marketData: {
                    price: totalNftValue / (formattedNftsData.length || 1), // Prix moyen par NFT
                    percent_change_24h: 0,
                    market_cap: totalNftValue,
                    volume_24h: 0,
                    last_updated: new Date().toISOString()
                }
            };

            // Formater la réponse finale
            const response = {
                address,
                chain: chainConfig.name,
                nativeBalance: nativeBalance.toJSON().balance,
                balances: [
                    // Token natif
                    {
                        type: 'NATIVE',
                        symbol: chain === 'ETHEREUM' ? 'ETH' : chainConfig.name,
                        name: `${chainConfig.name} Native Token`,
                        balance: nativeBalance.toJSON().balance,
                        address: chainConfig.nativeTokenAddress,
                        decimals: 18,
                        lastUpdated: new Date().toISOString(),
                        marketData: nativeTokenPrice ? {
                            price: nativeTokenPrice.usdPrice,
                            percent_change_24h: nativeTokenPrice.usdPrice24hrPercentChange,
                            usd_change_24h: nativeTokenPrice.usdPrice24hrUsdChange,
                            market_cap: nativeTokenPrice.usdMarketCap,
                            volume_24h: nativeTokenPrice.usdVolume24h,
                            last_updated: new Date().toISOString()
                        } : null
                    },
                    // Tokens ERC20
                    ...formattedTokens,
                    // Token virtuel pour les NFTs
                    nftToken
                ],
                nfts: formattedNftsData,
                lastUpdated: new Date().toISOString()
            };

            // Ajouter des logs pour déboguer les données de marché
           
            // Mettre en cache la réponse
            this.setCache(cacheKey, response);
            return response;

        } catch (error) {
            console.error('Erreur lors de la récupération des données du wallet:', error);
            throw error;
        }
    }

    async getSolanaWalletData(address) {
        try {
            await this.ensureInitialized();

            // Récupérer le solde natif (SOL)
            const nativeBalance = await Moralis.SolApi.account.getBalance({
                address
            });

          
            const solBalance = parseFloat(nativeBalance.toJSON().lamports) / 1e9;
    

            // Récupérer les tokens SPL (équivalent aux ERC20 sur Ethereum)
            const tokenBalances = await Moralis.SolApi.account.getSPL({
                address
            });

            // Récupérer les NFTs
            const nfts = await Moralis.SolApi.account.getNFTs({
                address
            });

            // Récupérer le prix du SOL en utilisant l'API token
            let nativeTokenPrice = null;
            try {
                // Utiliser l'adresse du Wrapped SOL sur Ethereum
                const nativePrice = await Moralis.EvmApi.token.getTokenPrice({
                    address: '0xD31a59c85aE9D8edEFeC411D448f90841571b89c', // Wrapped SOL sur Ethereum
                    chain: EvmChain.ETHEREUM
                });
                
                const priceData = nativePrice.toJSON();
              
                
                nativeTokenPrice = {
                    usdPrice: priceData.usdPrice || 0,
                    usdPrice24hChange: priceData.usdPrice24hrPercentChange || 0,
                    usdMarketCap: priceData.usdMarketCap || 0,
                    usdVolume24h: priceData.usdVolume24h || 0,
                    lastUpdated: new Date().toISOString()
                };
                
            } catch (error) {
                console.error('Erreur lors de la récupération du prix du SOL:', error);
                // Prix de fallback pour SOL
                try {
                    // Essayer avec une autre adresse de Wrapped SOL si la première échoue
                    const nativePrice = await Moralis.EvmApi.token.getTokenPrice({
                        address: '0xD31a59c85aE9D8edEFeC411D448f90841571b89c', // Autre adresse de Wrapped SOL
                        chain: EvmChain.ETHEREUM
                    });
                    
                    const priceData = nativePrice.toJSON();
                    nativeTokenPrice = {
                        usdPrice: priceData.usdPrice || 0,
                        usdPrice24hChange: priceData.usdPrice24hrPercentChange || 0,
                        usdMarketCap: priceData.usdMarketCap || 0,
                        usdVolume24h: priceData.usdVolume24h || 0,
                        lastUpdated: new Date().toISOString()
                    };
                } catch (fallbackError) {
                    console.error('Erreur lors de la récupération du prix de fallback du SOL:', fallbackError);
                    nativeTokenPrice = {
                        usdPrice: 100, // Prix par défaut
                        usdPrice24hChange: 0,
                        usdMarketCap: 0,
                        usdVolume24h: 0,
                        lastUpdated: new Date().toISOString()
                    };
                }
            }

            // Formater la réponse finale
            const response = {
                address,
                chain: SUPPORTED_CHAINS.SOLANA.name,
                nativeBalance: solBalance.toString(),
                balances: [
                    // Token natif (SOL)
                    {
                        type: 'NATIVE',
                        symbol: 'SOL',
                        name: 'Solana',
                        balance: solBalance.toString(),
                        address: 'So11111111111111111111111111111111111111112',
                        decimals: 9,
                        lastUpdated: new Date().toISOString(),
                        marketData: {
                            price: nativeTokenPrice.usdPrice,
                            percent_change_24h: nativeTokenPrice.usdPrice24hChange,
                            market_cap: nativeTokenPrice.usdMarketCap,
                            volume_24h: nativeTokenPrice.usdVolume24h,
                            last_updated: nativeTokenPrice.lastUpdated
                        }
                    },
                    // Tokens SPL
                    ...tokenBalances.toJSON().map(token => ({
                        type: 'ERC20',
                        address: token.mint,
                        name: token.name || 'Unknown Token',
                        symbol: token.symbol || 'UNKNOWN',
                        decimals: token.decimals,
                        balance: token.amount,
                        lastUpdated: new Date().toISOString()
                    }))
                ],
                nfts: nfts.toJSON().map(nft => ({
                    type: 'NFT',
                    contractAddress: nft.mint,
                    tokenId: nft.tokenAddress,
                    name: nft.name || 'Unknown NFT',
                    symbol: nft.symbol || 'UNKNOWN',
                    owner: address,
                    metadata: nft.metadata
                })),
                lastUpdated: new Date().toISOString()
            };

            return response;
        } catch (error) {
            console.error('Erreur lors de la récupération des données du wallet Solana:', error);
            throw error;
        }
    }

    async getTokenMetadata(address, chain = 'ETHEREUM') {
        try {
            const cacheKey = `token_${address}_${chain}`;
            const cachedData = this.getCache(cacheKey);
            if (cachedData) {
                return cachedData;
            }

            await this.ensureInitialized();

            const chainConfig = SUPPORTED_CHAINS[chain];
            if (!chainConfig) {
                throw new Error(`Chaîne non supportée: ${chain}`);
            }

            // Utiliser la méthode spécifique pour Solana
            if (chain === 'SOLANA') {
                return await this.getSolanaTokenMetadata(address);
            }

            const metadata = await Moralis.EvmApi.token.getTokenMetadata({
                addresses: [address],
                chain: chainConfig.chain
            });

            const result = metadata.toJSON()[0];
            this.setCache(cacheKey, result);
            return result;
        } catch (error) {
            console.error('Erreur lors de la récupération des métadonnées du token:', error);
            throw error;
        }
    }

    async getSolanaTokenMetadata(address) {
        try {
            const cacheKey = `token_${address}_SOLANA`;
            const cachedData = this.getCache(cacheKey);
            if (cachedData) {
                return cachedData;
            }

            await this.ensureInitialized();

            const metadata = await Moralis.SolApi.token.getTokenMetadata({
                addresses: [address]
            });

            const result = metadata.toJSON()[0];
            this.setCache(cacheKey, result);
            return result;
        } catch (error) {
            console.error('Erreur lors de la récupération des métadonnées du token Solana:', error);
            throw error;
        }
    }

    async getNFTMetadata(address, tokenId, chain = 'ETHEREUM') {
        try {
            const cacheKey = `nft_${address}_${tokenId}_${chain}`;
            const cachedData = this.getCache(cacheKey);
            if (cachedData) {
                return cachedData;
            }

            await this.ensureInitialized();

            const chainConfig = SUPPORTED_CHAINS[chain];
            if (!chainConfig) {
                throw new Error(`Chaîne non supportée: ${chain}`);
            }

            // Utiliser la méthode spécifique pour Solana
            if (chain === 'SOLANA') {
                return await this.getSolanaNFTMetadata(address, tokenId);
            }

            const metadata = await Moralis.EvmApi.nft.getNFTMetadata({
                address,
                tokenId,
                chain: chainConfig.chain
            });

            const result = metadata.toJSON();
            this.setCache(cacheKey, result);
            return result;
        } catch (error) {
            console.error('Erreur lors de la récupération des métadonnées du NFT:', error);
            throw error;
        }
    }

    async getSolanaNFTMetadata(address, tokenId) {
        try {
            const cacheKey = `nft_${address}_${tokenId}_SOLANA`;
            const cachedData = this.getCache(cacheKey);
            if (cachedData) {
                return cachedData;
            }

            await this.ensureInitialized();

            const metadata = await Moralis.SolApi.nft.getNFTMetadata({
                address,
                tokenId
            });

            const result = metadata.toJSON();
            this.setCache(cacheKey, result);
            return result;
        } catch (error) {
            console.error('Erreur lors de la récupération des métadonnées du NFT Solana:', error);
            throw error;
        }
    }

    getSupportedChains() {
        return Object.entries(SUPPORTED_CHAINS).map(([id, chain]) => ({
            id,
            name: chain.name,
            icon: chain.icon,
            description: chain.description
        }));
    }
}

module.exports = new MoralisService(); 