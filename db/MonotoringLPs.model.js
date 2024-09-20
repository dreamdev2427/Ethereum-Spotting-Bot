module.exports = (mongoose) => {
    const MonitoringLps = mongoose.model(
        "MonitoringLps",
        mongoose.Schema(
            {
                lpToken: {
                    type: String,
                    default: null,
                    unique: true
                },
                dexName: {
                    type: String,
                    default: null
                },
                tokenA: {
                    type: String,
                    default: null
                },
                tokenB: {
                    type: String,
                    default: null
                },
                feeTier: {
                    type: Number,
                    default: null
                },
                totalSupply: {
                    type: Number,
                    default: null
                },
                chainId: {
                    type: String,
                    default: 1
                },
                analyzed: {
                    type: Boolean,
                    default: false
                }
            },
            { timestamps: true }
        )
    );
    return MonitoringLps;
};
