const axios = require("axios");
const puppeteer = require('puppeteer');
const {ethers} = require("ethers");
const isEmpty = require("is-empty");

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

        const browser = await puppeteer.launch({
            args: ['--no-sandbox'],
            timeout: 10000,
          });
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

            response.buy = buyTaxText.trim()?.replace("%", "")
            response.sell = sellTaxText.trim()?.replace("%", "")
        }

        await browser.close();
    } catch (err) {
        console.log(`==> ${new Date().toLocaleString()}`)
        console.log(err)
    }

    return response;
}

function timeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now - date) / 1000);
  
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
    };
  
    for (let interval in intervals) {
      const duration = Math.floor(seconds / intervals[interval]);
      if (duration >= 1) {
        return duration === 1
          ? `1 ${interval} ago`
          : `${duration} ${interval}s ago`;
      }
    }
  
    return "Just now";
  }
  
  // Example usage:
//   console.log(timeAgo("2024-09-23T18:26:29.228Z")); // Will print "X mins ago", "X hrs ago", etc.
  

const generateTokenAlertMessage = async (tokenInfo, pairInfo, lpStatus, socials, safety) => {
    const taxInfo = await getTokenTaxesEth(tokenInfo?.address);
    const tokenTotalSupply = tokenInfo?.totalSupply;
    const decimals = tokenInfo?.decimals;
    const initalTokenInLP = ethers.formatUnits(tokenInfo["lpETHAmounts"][0]["tokenAmount"]?.toString(), decimals);
    const initalTokenInLPPercentage = Number(initalTokenInLP) / tokenTotalSupply * 100;    
    const launchTime = tokenInfo["lpETHAmounts"][0]["timestamp"];

    let universalScore = 0;
    if(!isEmpty(taxInfo) && !isEmpty(taxInfo.buy) && !isEmpty(taxInfo.sell) && !((Number(taxInfo?.buy) >= 10 || Number(taxInfo?.sell) >= 10)))
    {
        universalScore += 10;
    }
    if(!isEmpty(lpStatus) && lpStatus?.toString()?.includes("🟢") && Number(tokenInfo["lpETHAmounts"][0]["amount"]) >= 0.3 && Number(tokenInfo["lpETHAmounts"][0]["amount"]) < 5)
    {
        universalScore += 20;   
    }
    if(!isEmpty(safety?.renounced) && safety?.renounced?.toString()?.includes("🟢"))
    {
        universalScore += 20;   
    }
    if( tokenInfo?.verified == true )
    {
        universalScore += 10;   
    }    
    if(!isEmpty(safety?.proxy) && safety?.proxy?.toString()?.includes("🟢") )
    {
        universalScore += 10;   
    }
    if((100 - initalTokenInLPPercentage)<5)
    {
        universalScore += 10;         
    }
    if(!isEmpty(safety?.tradingDisable) && safety?.tradingDisable?.toString()?.includes("🟢") )
    {
        universalScore += 10;                 
    }
    if(!isEmpty(socials))
    {
        universalScore += 10;           
    }

    return `
    ChainSend Spotting bot | ${tokenInfo?.name} |

    📝CHAINSEND SCORE : ${universalScore}%📝

    🏅 TOKEN DETAILS 🏅
    🔹Token address: <a href="https://etherscan.io/address/${tokenInfo?.address}" target="_blank" >${tokenInfo?.address}</a> 
     Contract Verified:  ${tokenInfo?.verified? "🟢 Verified" : "❌ Not verified"} 
    💢Pair: $${tokenInfo?.symbol} / ETH
    💢Pair Address: <a href="https://etherscan.io/address/${pairInfo?.lpToken}" target="_blank" >${pairInfo?.lpToken}</a> <a href="https://dexscreener.com/ethereum/${pairInfo?.lpToken}" target="_blank" >Dexscreener</a> <a href="https://dextools.io/app/en/ether/pair-explorer/${pairInfo?.lpToken}" target="_blank" >Dextools</a>
    🌐Socials: ${isEmpty(socials) === false? socials: "" }
    🔖Tax: Buy ${isEmpty(taxInfo?.buy)? 0: taxInfo?.buy} %, Sell ${isEmpty(taxInfo?.sell)? 0: taxInfo?.sell} % ${(Number(taxInfo?.buy) >= 10 || Number(taxInfo?.sell) >= 10) ? "🔴 High taxes - Project Likely to fail Not recommended." : "🟢 Normal"}
    
    💰 LIQUIDITY POOL 💰
    1.  Pooled ETH Amount ${tokenInfo["lpETHAmounts"] && tokenInfo["lpETHAmounts"]?.length> 0 ? Number(tokenInfo["lpETHAmounts"][0]["amount"])?.toFixed(3) : 0 } ETH ${Number(tokenInfo["lpETHAmounts"][0]["amount"])?.toFixed(3)< 0.1? "🔴 Danger, insufficient LP ETH detected" :""}
    2.  Pooled token : ${isNaN(initalTokenInLPPercentage)? 0 : Number(initalTokenInLPPercentage).toFixed(2)}% of total supply ${Number(initalTokenInLPPercentage)>96? "🟢 Normal" : "🔴 Not safe" }   
    3.  LP Status : ${isEmpty(lpStatus)? "🟢 100% LP burnt": lpStatus}
    
    👨‍💻 Deployer: <a href="https://etherscan.io/address/${tokenInfo.deployer}" target="_blank" >${tokenInfo.deployer}</a> 
    Deployer funded amount: ${tokenInfo?.deployerFirstFundedAmount} ETH
    Deployer funded from: <a href="https://etherscan.io/address/${tokenInfo?.deployerFirstFundedFrom}" target="_blank" >${tokenInfo?.deployerFirstFundedFrom}</a> 
    
    SAFETY SPOT
    1.  Proxy Contract: ${ isEmpty(safety?.proxy) === false? safety.proxy : "Inconclusive"} 
    2.  Contract Verified:  ${tokenInfo?.verified? "🟢 Verified" : "❌ Not verified"} 
    3.  Renounced:  ${isEmpty(safety?.renounced) === false? safety.renounced : "Inconclusive"}    
    4.  Blacklisted: ${isEmpty(safety?.blacklisted) === false? safety.blacklisted : "Inconclusive"}  
    5.  Whitelisted:  ${isEmpty(safety?.whitelisted) === false? safety.whitelisted : "Inconclusive"}
    6.  Trading Disable Function:  ${isEmpty(safety?.tradingDisable) === false? safety.tradingDisable : "Inconclusive"}
    7.  Mintable: ${isEmpty(safety?.mintable) === false? safety.mintable : "Inconclusive"}
    8.  Token deployer holds (${Number(100 - initalTokenInLPPercentage)?.toFixed(2)})%: ${ (100 - initalTokenInLPPercentage)< 5? "🟢 Less than 5%" : (100 - initalTokenInLPPercentage)< 10? "🟠 Between 5 ~ 10%": `🔴 More than 10% ${(100 - initalTokenInLPPercentage) >= 70? "HIGH RISKY" : ""}` }

    🕰 Launched ${timeAgo(new Date(launchTime)?.toISOString())} 

    📝CHAINSEND SCORE : ${universalScore}%📝
    
    SNIPE: <a href="https://t.me/BananaGunSniper12_bot?start=safe_analyzer_${tokenInfo?.address}" target="_blank" >Banana</a>, <a href="https://t.me/GeekSwapBot/app?startapp=r_699Lr_ETH_${tokenInfo?.address}"  target="_blank" >GEEK</a>, <a href="https://t.me/AlfredTradesBot?start=SafeAnalyzer==${tokenInfo?.address}" target="_blank" >Alfred</a>, <a href="https://t.me/MaestroSniperBot?start=${tokenInfo?.address}-safeanalyzer" target="_blank" >Maestro</a>, <a href="https://t.me/Sigma_buyBot?start=${tokenInfo?.address}" target="_blank" >Signma</a>.
    
    `;
}

module.exports = {
    generateTokenAlertMessage,
    getMarketCapAndPrice,
    getTokenTaxesEth
}