module.exports = (mongoose) => {
    const HolderAddressSchema = mongoose.model(
        "Holders",
        mongoose.Schema(
            {
                tokenAddress: {
                    type: String,
                    required: true,
                    unique: true, // Ensure that each token address is unique
                    validate: {
                        validator: function (value) {
                            // Check if the value is a valid Ethereum address (40-character hexadecimal string)
                            const regex = /^(0x)?[0-9a-fA-F]{40}$/;
                            return regex.test(value);
                        },
                    },
                },
                holderAddresses: {
                    type: [{
                        type: String,

                    }],
                },
            },
            { timestamps: true }
        )
    );
    return HolderAddressSchema;
};
