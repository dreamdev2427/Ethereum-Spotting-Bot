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

        const browser = await puppeteer.launch({ignoreDefaultArgs: ['--disable-extensions']})
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
    const launchTime = tokenInfo["lpETHAmounts"][0]["timestamp"];

    return `
    ChainSend Spotting bot | ${tokenInfo?.name} |

    🏅 TOKEN DETAILS 🏅
    🔹Token address: ${tokenInfo?.address}
    💢Pair: $${tokenInfo?.symbol} / ETH
    💢Pair Address: ${pairInfo?.lpToken}
    🌐Socials: Website Telegram Twitter
    🔖Tax: Buy ${taxInfo?.buy} %, Sell ${taxInfo?.sell} %
    
    💰 LIQUIDITY POOL 💰
    1.  LP Amount ${tokenInfo["lpETHAmounts"] && tokenInfo["lpETHAmounts"]?.length> 0 ? Number(tokenInfo["lpETHAmounts"][0]["amount"])?.toFixed(3) : 0 } ETH
    2.  Initial % pooled: ${isNaN(initalTokenInLPPercentage)? 0 : Number(initalTokenInLPPercentage).toFixed(2)}% of the total supply    
    3.  LP Status : 100% LP Burnt
    
    👨‍💻 Deployer:  ${tokenInfo.deployer}
    Bundle CA:  ${tokenInfo?.bundled? "❌ Bundled": "🟢 Not bundled"}
    
    SAFETY SPOT
    1.  Proxy Contract: ${tokenInfo?.isProxy? "❌ proxy" : "🟢 No proxy"} 
    2.  Contract Verified:  ${tokenInfo?.verified? "🟢 Verified" : "❌ Not verified"} 
    3.  Renounced:  ${tokenInfo?.renounced? "🟢 Renounced" : "❌ Not renounced"}    
    4.  Blacklisted: ${tokenInfo?.blacklisted? "❌ Blacklisted" : "🟢 Not blacklisted"}  
    5.  Whitelisted:  ${tokenInfo?.whitelisted? "❌ Whitelisted" : "🟢 Not whitelisted"}
    6.  Trading Disable Function:  ${tokenInfo?.isTradingDisable? "❌ Has disable func" : "🟢 No disable func"}
    7.  Mintable: ${tokenInfo?.isMintable? "❌ Mintable" : "🟢 Not mintable"}

    🕰 Time launched : ${new Date(launchTime)?.toISOString() }

    SNIPE:  Banana, GEEK, Alfred, Maestro, Signma.

    `;
}

module.exports = {
    generateTokenAlertMessage,
    getMarketCapAndPrice,
    getTokenTaxesEth
}