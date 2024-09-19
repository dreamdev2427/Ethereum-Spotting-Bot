module.exports = (mongoose) => {
    const MonitoringToken = mongoose.model(
        "MonitoringToken",
        mongoose.Schema(
            {
                address: {
                    type: String,
                    default: null,
                    unique: true
                },
                symbol: {
                    type: String,
                    default: null
                },
                decimals: {
                    type: Number,
                    default: null
                },
                verified: {
                    type: Boolean,
                    default: null
                },
                verifiedTime: {
                    type: Date,
                    default: null
                },
                name: {
                    type: String,
                    default: null
                },
                totalSupply: {
                    type: Number,
                    default: null
                },
                deployer: {
                    type: String,
                    default: null
                },
                deployedTime: {
                    type: Date,
                    default: null
                },
                deployerFirstFundedAmount: {
                    type: Number,
                    default: null
                },
                deployerFirstFundedFrom: {
                    type: String,
                    default: null
                },
                deployerBalance: {
                    type: Number,
                    default: null
                },
                deployerWalletMadeTime: {
                    type: Date,
                    default: null
                },
                opened2Trading: {
                    type: Boolean,
                    default: false
                },
                opened2TradingTime: {
                    type: Date,
                    default: null
                },
                lpAdded: {
                    type: Boolean,
                    default: false
                },
                lpAddresses: {
                    type: Array,
                    default: []
                },
                lpETHAmounts: {
                    type: Array,
                    default: []
                },
                lpLockedLastTime: {
                    type: Date,
                    default: null
                },
                launcheMethodId: {
                    type: String,
                    default: null
                },
                lpLockedLastDueTime: {
                    type: Date,
                    default: null
                },
                lpLastActivityName: {
                    type: String,
                    default: null
                },
                lpLastLockedHash: {
                    type: String,
                    default: null
                },
                lpLockedRate: {
                    type: Number,
                    default: null
                },
                firstBlockBuys: {
                    type: Number,
                    default: null
                }
            },
            { timestamps: true }
        )
    );
    return MonitoringToken;
};
