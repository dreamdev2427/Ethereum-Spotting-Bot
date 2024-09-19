module.exports = (mongoose) => {
    const ActivityOfLps = mongoose.model(
        "ActivityOfLps",
        mongoose.Schema(
            {
                tokenAddress: {
                    type: String,
                    default: null,
                },
                lpToken: {
                    type: String,
                    default: null,
                },
                totalSupply: {
                    type: Number,
                    default: null
                },
                activityName: {
                    type: String,
                    default: null
                },
                amount: {
                    type: Number,
                    default: null
                },
                dueDate: {
                    type: Date,
                    default: null
                },
                locker: {
                    type: String,
                    default: null
                },
                withdrawer: {
                    type: String,
                    default: null
                },
                txHash: {
                    type: String,
                    default: null
                },
                actionTime: {
                    type: Date,
                    default: new Date()
                }
            },
            { timestamps: true }
        )
    );
    return ActivityOfLps;
};
