const Moralis = require('moralis').default;
const { EvmChain } = require('@moralisweb3/common-evm-utils');
const db = require('../database');
const { decrypt } = require('../utils/encryption');

// Liste des chaînes supportées
const SUPPORTED_CHAINS = {
    ETHEREUM: {
        name: 'Ethereum',
        chain: EvmChain.ETHEREUM,
        icon: '🌐',
        description: 'Réseau Ethereum principal',
        nativeTokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' // WETH
    },
    POLYGON: {
        name: 'Polygon',
        chain: EvmChain.POLYGON,
        icon: '💜',
        description: 'Réseau Polygon (Matic)',
        nativeTokenAddress: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f1c' // WMATIC
    },
    BSC: {
        name: 'Binance Smart Chain',
        chain: EvmChain.BSC,
        icon: '🟡',
        description: 'Réseau Binance Smart Chain',
        nativeTokenAddress: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8' // WBNB
    },
    ARBITRUM: {
        name: 'Arbitrum',
        chain: EvmChain.ARBITRUM,
        icon: '🔵',
        description: 'Réseau Arbitrum',
        nativeTokenAddress: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1' // WETH
    },
    BASE: {
        name: 'Base',
        chain: EvmChain.BASE,
        icon: '🔷',
        description: 'Réseau Base',
        nativeTokenAddress: '0x4200000000000000000000000000000000000006' // WETH
    },
    OPTIMISM: {
        name: 'Optimism',
        chain: EvmChain.OPTIMISM,
        icon: '🟢',
        description: 'Réseau Optimism',
        nativeTokenAddress: '0x4200000000000000000000000000000000000006' // WETH
    },
    LINEA : {
        name: 'Linea',
        chain: EvmChain.LINEA,
        icon: '👀',
        description:'Réseau Linea',
        nativeTokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    },
    AVALANCHE: {
        name: 'Avalanche',
        chain: EvmChain.AVALANCHE,
        icon: '🔥',
        description: 'Réseau Avalanche',
        nativeTokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' // WETH
    },
    FANTOM: {
        name: 'Fantom',
        chain: EvmChain.FANTOM,
        icon: '🔥',
        description: 'Réseau Fantom',
        nativeTokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' // WETH
    },
    CRONOS: {
        name: 'Cronos',
        chain: EvmChain.CRONOS,
        icon: '🔥',
        description: 'Réseau Cronos',
        nativeTokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' // WETH
    },
    GNOSIS: {
        name: 'Gnosis',
        chain: EvmChain.GNOSIS,
        icon: '🔥',
        description: 'Réseau Gnosis',
        nativeTokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' // WETH
    },
    CHILLIZ: {
        name: 'Chilliz',
        chain: EvmChain.CHILLIZ,
        icon: '🔥',
        description: 'Réseau Chilliz',
        nativeTokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' // WETH
    },
    MOONBEAM: {
        name: 'Moonbeam',
        chain: EvmChain.MOONBEAM,
        icon: '🔥',
        description: 'Réseau Moonbeam',
        nativeTokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' // WETH
    },
    BLAST: {
        name: 'Blast',
        chain: EvmChain.BLAST,
        icon: '🔥',
        description: 'Réseau Blast',
        nativeTokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' // WETH
    },

    ZKSYNC: {
        name: 'ZkSync',
        chain: EvmChain.ZKSYNC,
        icon: '🔥',
        description: 'Réseau ZkSync',
        nativeTokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' // WETH
    },

    MANTLE: {
        name: 'Mantle',
        chain: EvmChain.MANTLE,
        icon: '🔥',
        description: 'Réseau Mantle',
        nativeTokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' // WETH
    },

    OPBNB: {
        name: 'OpBNB',
        chain: EvmChain.opBNB,
        icon: '🔥',
        description: 'Réseau OpBNB',
        nativeTokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' // WETH
    },
    POLYGON_ZKEVM: {
        name: 'Polygon zkEVM',
        chain: EvmChain.POLYGON_ZKEVM,
        icon: '🔥',
        description: 'Réseau Polygon zkEVM',
        nativeTokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' // WETH
    },

    ZETACHAIN: {
        name: 'ZetaChain',
        chain: EvmChain.ZETACHAIN,
        icon: '🔥',
        description: 'Réseau ZetaChain',
        nativeTokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' // WETH
    },

    FLOW: {
        name: 'Flow',
        chain: EvmChain.FLOW,
        icon: '🔥',
        description: 'Réseau Flow',
        nativeTokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' // WETH
    },
    RONIN: {
        name: 'Ronin',
        chain: EvmChain.RONIN,
        icon: '🔥',
        description: 'Réseau Ronin',
        nativeTokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' // WETH
    },

    LISK: {
        name: 'Lisk',
        chain: EvmChain.LISK,
        icon: '🔥',
        description: 'Réseau Lisk',
        nativeTokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' // WETH
    },

    PULSECHAIN: {
        name: 'PulseChain',
        chain: EvmChain.PULSECHAIN,
        icon: '🔥',
        description: 'Réseau PulseChain',
        nativeTokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' // WETH
    },

    
    SOLANA: {
        name: 'Solana',
        chain: 'solana',
        icon: '☀️',
        description: 'Réseau Solana',
        nativeTokenAddress: 'So11111111111111111111111111111111111111112' // Adresse du token SOL natif
    }

};

let isInitialized = false;

async function initializeMoralis() {
    if (isInitialized) {
        return;
    }

    try {
        // Récupérer la clé API Moralis depuis la base de données
        const apiKey = await db.getAsync(
            'SELECT encrypted_key FROM ApiKey WHERE service = ? LIMIT 1',
            ['MORALIS']
        );

        if (!apiKey) {
            throw new Error('Clé API Moralis non trouvée');
        }

        // Déchiffrer la clé API
        const decryptedKey = decrypt(apiKey.encrypted_key);

        // Initialiser Moralis
        await Moralis.start({
            apiKey: decryptedKey,
            // Configuration par défaut
            defaultEvmApiChain: EvmChain.ETHEREUM,
            // Activer les fonctionnalités nécessaires
            logLevel: 'error'
        });

        isInitialized = true;
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de Moralis:', error);
        throw error;
    }
}

function getSupportedChains() {
    return Object.entries(SUPPORTED_CHAINS).map(([id, chain]) => ({
        id,
        name: chain.name,
        icon: chain.icon,
        description: chain.description
    }));
}

module.exports = {
    Moralis,
    EvmChain,
    SUPPORTED_CHAINS,
    initializeMoralis,
    getSupportedChains,
    isInitialized
}; 