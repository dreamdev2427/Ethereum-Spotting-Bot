const axios = require("axios");
const puppeteer = require('puppeteer');
const {ethers} = require("ethers");

async function getMarketCapAndPrice(pairAddress) {
	try {
		const pairInforResponse = await axios.get(
			`https://api.dexscreener.io/latest/dex/pairs/ethereum/${pairAddress}`,
		);
		return {
			fdv: pairInforResponse.data["pairs"][0]["fdv"],
			price:
				pairInforResponse.data["pairs"][0]["liquidity"]["usd"] /
				2.0 /
				pairInforResponse.data["pairs"][0]["liquidity"]["quote"],
		};
	} catch (err) {
		console.error(err);
		return {
			fdv: 0,
			price: 0,
		};
	}
}

async function getTokenTaxesEth(tokenAddress) {

    let response = {
        buy: null,
        sell: null,
    }
    try {
        const url = `https://honeypot.is/ethereum?address=${tokenAddress}`

        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        await page.goto(url, { waitUntil: 'networkidle0' });

        // Wait for the website to fully render
        await page.waitForXPath('//*[@id="hp_info_box"]/div/div/div[2]/ul/div/li[1]/p');
        let [buyTaxElement] = await page.$x('//*[@id="hp_info_box"]/div/div/div[2]/ul/div/li[1]/p');
        let buyTaxText = await page.evaluate(element => element.textContent, buyTaxElement);

        let [sellTaxElement] = await page.$x('//*[@id="hp_info_box"]/div/div/div[2]/ul/div/li[4]/p');
        let sellTaxText = await page.evaluate(element => element.textContent, sellTaxElement);

        if (/^\d+(\.\d+)?%$/.test(buyTaxText.trim()) && /^\d+(\.\d+)?%$/.test(sellTaxText.trim())) {
            console.log(`buy tax: ${buyTaxText.trim()} sell tax: ${sellTaxText.trim()}`);

            response.buy = buyTaxText.trim()
            response.sell = sellTaxText.trim()
        }

        await browser.close();
    } catch (err) {
        console.error(`==> ${new Date().toLocaleString()}`)
        console.error(err)
    }

    return response;
}


const generateTokenAlertMessage = async (tokenInfo, pairInfo) => {
    const taxInfo = await getTokenTaxesEth(tokenInfo?.address);
    const tokenTotalSupply = tokenInfo?.totalSupply;
    const decimals = tokenInfo?.decimals;
    const initalTokenInLP = ethers.formatUnits(tokenInfo["lpETHAmounts"][0]["tokenAmount"]?.toString(), decimals);
    const initalTokenInLPPercentage = Number(initalTokenInLP) / tokenTotalSupply * 100;    

    return `
    ChainSend Spotting bot | ${tokenInfo?.name} |

    🏅 TOKEN DETAILS 🏅
    🔹Token address: ${tokenInfo?.address}
    💢Pair: $${tokenInfo?.symbol} / ETH
    💢Pair Address: ${pairInfo?.lpToken}
    ${tokenInfo?.verified? "🟢 Verified" : "❌Not verified"} 
    🌐Socials: Website Telegram Twitter
    🔖Tax: Buy ${taxInfo?.buy} %, Sell ${taxInfo?.sell} %
    
    💰 LIQUIDITY POOL 💰
    1.  LP Amount ${tokenInfo["lpETHAmounts"] && tokenInfo["lpETHAmounts"]?.length> 0 ? Number(tokenInfo["lpETHAmounts"][0]["amount"])?.toFixed(3) : 0 } ETH
    2.  Initial % pooled: ${isNaN(initalTokenInLPPercentage)? 0 : Number(initalTokenInLPPercentage).toFixed(2)}% of the total supply    
    3.  LP Status : 100% LP Burnt
    
    👨‍💻 Deployer:  ${tokenInfo.deployer}
    Bundle CA:  Yes/NO
            20%  Supply bundled (link to bundled wallets)
    
    SAFETY SPOT
    1.  Proxy Contract: Y/N
    2.  Contract Verified:  ${tokenInfo?.verified? "🟢 " : "❌"} 
    3.  Renounced:  Y/N   Fake Renounce:  YES (only 10% of supply in LP)
    4.  Blacklisted: Y/N   Specify number e.g (3 wallets)
    5.  Whitelisted:  Y/N
    6.  Proxy Contract: Y/N  (link to the proxy on etherscan)
    7.  Trading Disable Function:  YES/NO
    8.  Mintable: Y/N

    🕰 Time launched - 3 hours ago
    Wallet Amount: 0.5ETH or 1,125 USD
    Total Tax Generated: 4.5ETH or 6,890 , 100% tax
                        100% of the bundled wallet sold.
    Amount transferred out: 4.0ETH or 96% of the tax

    SNIPE:  Banana, GEEK, Alfred, Maestro, Signma.

    `;
}

module.exports = {
    generateTokenAlertMessage,
    getMarketCapAndPrice,
    getTokenTaxesEth
}