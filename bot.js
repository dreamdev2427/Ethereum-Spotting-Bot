const dotenv = require('dotenv')
dotenv.config();
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const { setIntervalAsync } = require("set-interval-async/dynamic");
const { ethers, JsonRpcProvider, toBeArray } = require('ethers');
var abiDecoder = require("abi-decoder");
const axios = require("axios");

const imageBannerPath = './banner.jfif';

const db = require("./db");
const MonitoringToken = db.mornitoringToken;
const MonitoringLp = db.monitoringLps;

const IUniswapV2FactoryABI = require('./abis/uniswapV2Factory.json');
const { abi: IUniswapV3FactoryABI } = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Factory.sol/IUniswapV3Factory.json');
const { abi: IUniswapV3PoolABI } = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json');
const uniswapV2RouterAbi = require("./abis/uniswapv2Router.json");
const erc20Abi = require("./abis/erc20.json");
const nonfungiblePositionManagerAbi = require("./abis/positionsNFT.json");
const unicxLockerAbi = require("./abis/unicxLocker.json");
const pinksaleLockerAbi = require("./abis/pinksaleLocker.json");
const metadropFactoryAbi = require("./abis/erc20FactoryByMetadroper.json");
const uniswapv2PariAbi = require("./abis/uniswapv2pair.json");
const isEmpty = require('is-empty');
const { generateTokenAlertMessage } = require('./generateTokenAlertMessage');

const DEPLOYED_TIME_OF_UNISWAPV2_FACTORY = new Date(1588610042 * 1000);
const METADROP_ERC20_FACTORY_ADDRESS = "0x8cDD488363dE72635b55BB263cc4C29041e6aa1a";
const METADROP_CREATEERC20_METHOD_ID = "0x6e3fa5d1";
const TRUSTSWAP_LOCKER_ADDRESS = "0xE2fE530C047f2d85298b07D9333C05737f1435fB";
const TRUSTSWAP_LOCK_METHOD_ID = "0x5af06fed";
const PINKSAKLE_LOCKER_ADDRESS = "0x71B5759d73262FBb223956913ecF4ecC51057641";
const PINKESALE_LOCK_METHOD_ID = "0x07279357";
const UNICX_LOCKER_CONTRACT_ADDRESS = "0x663A5C229c09b049E36dCc11a9B0d4a8Eb9db214";
const UNICX_LOCK_METHOD_ID = "0x8af416f6";
const UNICX_UNLOCK_METHOD_ID = "0x4532d776";
const TRANSFER_METHOD_ID = "0xa9059cbb";
const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";
const CONTRACT_CREATION_METHOD_ID = "0x60806040";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const UNISWAP_V2_ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
const NON_FUNGIABLE_POSITION_MANAGER_ADDRESS = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88";
const BASE_URL = "https://api.etherscan.io/api";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const HTTP_RPC_URL = process.env.HTTP_RPC_URL;
const HTTP_ALCHEMY_RPC_URL = process.env.ALCHEMY_RPC_URL;
const BUFFERING_TIME_IN_SECONDS = process.env.BUFFERING_TIME_IN_SECONDS;
const UNISWAP_V2_FACTORY_ADDRESS = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
const UNISWAP_V3_FACTORY_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984';
const BLOCK_BUYING_DURATION = 45 * 1000; //45 second

const EVENT_DEPLOY_NEW_TOKEN = "DEPLOY_NEW_TOKEN";
const EVENT_LOCKED_LIQUIDITY = "LOCKED_LIQUIDITY";
const EVENT_LIVE_TRADING_PAIR_LIVE = "LIVE_TRADING_PAIR_LIVE";
const EVENT_CONTRACT_VERIFIED = "CONTRACT_VERIFIED";
const EVENT_BURNED_LIQUIDITY = "BURNED_LIQUIDITY";
const EVENT_UNLOCK_LIQUIDITY = "UNLOCK_LIQUIDITY";
const EVENT_ADD_LIQUIDITY = "ADD_LIQUIDITY";

const OPEN_TRADING_METHOD_ID = "0xc9567bf9";
const OPEN_TRADING_METHOD_ID2 = "0x51cd7cc3";
const OPEN_TRADE_METHOD_ID = "0xfb201b1d";
const OPEN_TRADED_METHOD_ID = "0x723a4d56";
const ENABLE_TRADING_METHOD_ID = "0x8a8c523c";
const LAUNCH_METHOD_ID = "0x02ac8168";
const LAUNCH_METHOD_ID2 = "0x01339c21";
const SET_TRADING_METHOD_ID = "0x7c519ffb";

const ethersProvider = new JsonRpcProvider(HTTP_RPC_URL);
const ethersAlchemyProvider = new JsonRpcProvider(HTTP_ALCHEMY_RPC_URL);

abiDecoder.addABI(IUniswapV2FactoryABI);
abiDecoder.addABI(uniswapV2RouterAbi);
abiDecoder.addABI(erc20Abi);
abiDecoder.addABI(nonfungiblePositionManagerAbi);
abiDecoder.addABI(unicxLockerAbi);
abiDecoder.addABI(pinksaleLockerAbi);
abiDecoder.addABI(metadropFactoryAbi);
abiDecoder.addABI(uniswapv2PariAbi);

const token = process.env.TELEGRAM_BOT_TOKEN; // Replace with your own bot token
const bot = new TelegramBot(token, { polling: true });
const blocksToMonitor = 1;
const botChatId = -4511482561;  //chat id of group "Chainsend Spotting Bot"

db.mongoose
	.connect(db.url)
	.then(() => {

	})
	.catch(err => {

		process.exit();
	});

bot.on('message', (msg) => {
	const chatId = msg.chat.id;
	const messageText = msg.text;

	console.log(" chatId : ", chatId);
	console.log(" messageText : ", messageText);

	if (messageText === '/start') {
		bot.sendMessage(chatId, 'Welcome to the bot!');
	}
});


async function getChatId() {
	try {
		const response = await axios.get(`https://api.telegram.org/bot${token}/getUpdates`);
		if (response.data && response.data.result.length > 0) {
			console.log("result data :", response.data?.result);

			console.log("result length:", response.data?.result?.length);


			console.log("result[0]:", response.data.result[0]);
			console.log("result[1]:", response.data.result[1]);

		} else {
			console.log("No messages found in updates.");
		}
	} catch (error) {
		// console.error("Error getting updates:", error);
	}
}


var pendingAddLiquidityV2 = [];
var pendingOpenTradingV2 = [];
var pendingBurningLP = [];
var pendingRenounceToken = [];
var pairsOnAnalyze = new Map();
var tokensOnCheckVerification = new Map();




function parseTx(input) {
	if (input == "0x") return ["0x", []];
	let decodedData = abiDecoder.decodeMethod(input);
	let method = decodedData["name"];
	let params = decodedData["params"];

	return [method, params];
}

// Fetch contract details
async function getContractDetails(tokenAddress) {
	const url = `${BASE_URL}?module=contract&action=getsourcecode&address=${tokenAddress}&apikey=${ETHERSCAN_API_KEY}`;
	const response = await axios.get(url);
	return response.data;
}

// Fetch block timestamp
async function getBlockTimestamp(blockNumber) {
	const url = `${BASE_URL}?module=block&action=getblockreward&blockno=${blockNumber}&apikey=${ETHERSCAN_API_KEY}`;
	const response = await axios.get(url);
	return response.data.result.timeStamp;
}

async function checkVerifiedAndGetDeployer(tokenAddress) {
	let verified = false,
		timestamp = null,
		verifiedTime = null
	let deployerData;
	try {
		const contractDetails = await getContractDetails(tokenAddress);
		if (
			contractDetails.status === "1" &&
			contractDetails.result[0].ContractName
		) {
			verified = true;
			verifiedTime = contractDetails.result[0].VerificationDate;
		} else {

		}

		deployerData = await getDeployerAddressAndBlockNumber(tokenAddress);
		if (deployerData) {

			timestamp = await getBlockTimestamp(deployerData.blockNumber);

		} else {

		}
		return {
			verified: verified,
			deployer: deployerData?.address || null,
			timestamp: timestamp,
			verifiedTime: verifiedTime,
			name: contractDetails?.result[0]?.ContractName || "",
		};
	} catch (err) {
		console.error("An error occurred:", err);
		return {
			verified: verified,
			name: "",
			deployer: deployerData?.address || null,
			timestamp: timestamp,
			verifiedTime: verifiedTime
		};
	}
}

async function isPending(transactionHash) {
	try {
		return (await ethersProvider.getTransactionReceipt(transactionHash)) == null;
	}
	catch (error) {
		throw error;
	}
}

const decodeTxLogs = (abi, logs) => {
	// Create an Interface instance with the ABI
	const iface = new ethers.Interface(abi);

	let ret = [];

	// Loop through the logs and decode them using the interface
	for (const log of logs) {
		try {
			// Try to parse the log and match it with the event signatures in the ABI
			const parsedLog = iface.parseLog(log);

			// If parsing succeeds, add the decoded log with event name
			ret.push({
				...parsedLog.args,
				name: parsedLog.name
			});
		} catch (error) {
			// If log parsing fails (e.g., log doesn't match ABI), skip the log
			continue;
		}
	}

	return ret;
}

async function getFirstIncomingETHTransaction(developerWalletAddress) {

	let firstFundingInfo = {
		fundingAmount: 0,
		fundingFrom: ""
	}
	try {
		const url = `${BASE_URL}?module=account&action=txlist&address=${developerWalletAddress}&sort=asc&apikey=${ETHERSCAN_API_KEY}`;
		const response = await axios.get(url);
		const transactions = response?.data?.result || [];

		if (isEmpty(transactions) === true) return null;

		const incomingETHTransactions = transactions.filter(tx =>
			tx.to.toLowerCase() === developerWalletAddress.toLowerCase() &&
			BigInt(tx.value) > 0
		);

		const firstIncomingETHTransaction = incomingETHTransactions.length > 0 ? incomingETHTransactions[0] : null;

		if (firstIncomingETHTransaction) {

			firstFundingInfo.fundingAmount = ethers.formatEther(firstIncomingETHTransaction.value);
			firstFundingInfo.fundingFrom = firstIncomingETHTransaction.from;
		} else {

		}

		console.log("firstFundingInfo : ", firstFundingInfo);
		return firstFundingInfo;
	} catch (error) {
		console.error(`Error fetching transactions: ${error}`);
		return firstFundingInfo;
	}
}

// Function to get LP Token Address in Uniswap V2
async function getLPTokenAddressV2(tokenAddress) {
	try {
		const factoryContract = new ethers.Contract(UNISWAP_V2_FACTORY_ADDRESS, IUniswapV2FactoryABI, ethersProvider);

		const poolAddress = await factoryContract.getPair(tokenAddress, WETH_ADDRESS);

		if (poolAddress === ZERO_ADDRESS) {
			return null;
		}

		return poolAddress;
	} catch (err) {
		console.error(err);
		return null;
	}
}

function isEthereumWalletAddress(address) {
	const ethereumAddressRegex = /^(0x)?[0-9a-fA-F]{40}$/;
	return ethereumAddressRegex.test(address);
}

const getLpAddresses = async (tokenAddress) => {

	let lpAddresses = [];
	try {
		let lpv2 = await getLPTokenAddressV2(tokenAddress);
		if (lpv2 !== null && isEthereumWalletAddress(lpv2)) {
			lpAddresses.push(lpv2);
			let lpContract = new ethers.Contract(lpv2, erc20Abi, ethersProvider);
			let totalSupply = await lpContract.totalSupply();
			totalSupply = ethers.formatEther(totalSupply?.toString());
			let newMLP = new MonitoringLp({
				lpToken: lpv2,
				dexName: "UniswapV2",
				tokenA: tokenAddress,
				tokenB: WETH_ADDRESS,
				totalSupply: Number(totalSupply?.toString())
			});
			try {
				const doc = await newMLP.save();
				console.log(doc);
			} catch (err) { }
		}

		return lpAddresses;
	} catch (err) {
		console.error(err);
		return lpAddresses;
	}
}

const updateLPFieldsByPendingAL = async (pendingAl, lpAddress) => {

	let FoundToken = await MonitoringToken.findOne({ address: new RegExp('^' + pendingAl.tokenAddress + '$', 'i') });
	if (FoundToken) {
		let updatingFields = {
			lpAdded: true,
			opened2TradingTime: new Date(pendingAl.timestamp),
			opened2Trading: true  // because almose all tokens do open trading and add liquidity at same time
		};
		let currentAddresses = FoundToken["lpAddresses"] || [];
		currentAddresses = currentAddresses.includes(lpAddress) === false ? [...currentAddresses, lpAddress] : currentAddresses;
		updatingFields = {
			...updatingFields,
			lpAddresses: currentAddresses
		}
		let currentLpETHs = FoundToken["lpETHAmounts"] || [];
		currentLpETHs = [...currentLpETHs, {
			address: lpAddress,
			amount: pendingAl.lpETHAmount,
			tokenAmount: pendingAl.lpTokenAmount,
			timestamp: pendingAl.timestamp
		}];
		updatingFields = {
			...updatingFields,
			lpETHAmounts: currentLpETHs
		}
		MonitoringToken.findByIdAndUpdate(FoundToken._id, {
			...updatingFields
		}).then((data) => {
			console.log(data);
		}).catch((error => {
			console.error(error);
		}));
	} else {
		// //add this token to DB
		fillBasicInforOfToken(pendingAl.tokenAddress, {
			lpAdded: true,
			opened2TradingTime: new Date(pendingAl.timestamp),
			lpAddresses: [lpAddress],
			opened2Trading: true,
			lpETHAmounts: [
				{
					address: lpAddress,
					amount: pendingAl.lpETHAmount,
					tokenAmount: pendingAl.lpTokenAmount,
					timestamp: pendingAl.timestamp
				}
			]
		});
	}
}

// Fetch deployer address and block number
async function getDeployerAddressAndBlockNumber(tokenAddress) {
	const url = `${BASE_URL}?module=account&action=txlist&address=${tokenAddress}&sort=asc&apikey=${ETHERSCAN_API_KEY}`;
	const response = await axios.get(url);
	const transactions = response.data.result;
	// Assuming the first transaction is the contract deployment
	if (isEmpty(transactions) === false) {
		if (transactions?.length > 0) {
			return {
				address: transactions[0].from,
				blockNumber: transactions[0].blockNumber,
				actionTime: new Date(transactions[0].timeStamp * 1000)
			};
		} else {
			return null;
		}
	} else {
		return null;
	}
}

const fillBasicInforOfToken = async (tokenAddress, updatingFields = {}) => {

	try {
		let tokenContract = new ethers.Contract(tokenAddress, erc20Abi, ethersProvider);
		let symbol = await tokenContract.symbol();
		let name = await tokenContract.name();
		let decimals = await tokenContract.decimals();
		let totalSupply = await tokenContract.totalSupply();
		totalSupply = ethers.formatUnits(totalSupply?.toString(), decimals);

		if (isEmpty(name) === false) {

			const checkresult = await checkVerifiedAndGetDeployer(
				tokenAddress
			);
			console.log("checkresult : ", checkresult);
			let firstFundingInfo = isEmpty(checkresult?.deployer) ? { fundingAmount: 0, fundingFrom: ZERO_ADDRESS } : await getFirstIncomingETHTransaction(checkresult.deployer);
			let deployerBalance = isEmpty(checkresult?.deployer) ? 0 : await ethersProvider.getBalance(checkresult.deployer);
			deployerBalance = ethers.formatEther(deployerBalance?.toString());
			console.log("deployerBalance : ", deployerBalance);
			let lpAddresses = await getLpAddresses(tokenAddress);
			console.log("lpAddresses : ", lpAddresses);
			let walletInfo = await getDeployerAddressAndBlockNumber(checkresult.deployer);
			console.log("walletInfo : ", walletInfo);

			let newMonitoring = new MonitoringToken({
				address: tokenAddress,
				symbol: symbol,
				name: name,
				decimals: Number(decimals?.toString()),
				totalSupply: Number(totalSupply?.toString()),
				verified: checkresult.verified,
				deployer: checkresult.deployer,
				deployedTime: new Date(checkresult.timestamp * 1000),
				deployerFirstFundedAmount: firstFundingInfo?.fundingAmount || 0,
				deployerFirstFundedFrom: firstFundingInfo?.fundingFrom || ZERO_ADDRESS,
				deployerBalance: deployerBalance,
				deployerWalletMadeTime: isEmpty(walletInfo?.address) ? new Date("1970-01-01") : walletInfo?.actionTime,
				lpAddresses: lpAddresses,
				verifiedTime: checkresult?.verifiedTime || new Date("1970-01-01"),
				...updatingFields
			});
			const doc = await newMonitoring.save();
			console.log(doc);
		}

	} catch (err) { console.log(err) }
}

async function getBlockRange(blocksToMonitor) {
	const latestBlock = await ethersProvider.getBlockNumber();
	console.log(`Latest Block Number: ${latestBlock}`);

	// Set startBlock and endBlock automatically
	const endBlock = latestBlock;
	const startBlock = latestBlock - blocksToMonitor + 1;

	return { startBlock, endBlock };
}

async function monitorPairCreated(startBlock, endBlock) {
	console.log(`Monitoring PairCreated event from block ${startBlock} to ${endBlock}...`);
	const uniswapV2FactoryABI = [
		'event PairCreated(address indexed token0, address indexed token1, address pair, uint256)'
	];

	const uniswapV2FactoryContract = new ethers.Contract(UNISWAP_V2_FACTORY_ADDRESS, uniswapV2FactoryABI, ethersProvider);

	// Define the event filter for PairCreated
	const pairCreatedEventFilter = uniswapV2FactoryContract.filters.PairCreated();
	let eventlist = [];

	// Listen to PairCreated events in the block range
	for (let block = startBlock; block <= endBlock; block++) {
		try {
			const events = await uniswapV2FactoryContract.queryFilter(pairCreatedEventFilter, block, block);

			events.forEach((event) => {
				const { token0, token1, pair } = event.args;

				// Return the event data as JSON object
				const eventData = {
					token0: token0,
					token1: token1,
					pair: pair
				};

				console.log('PairCreated event  :', JSON.stringify(eventlist, null, 2));
				eventlist.push(eventData);

			});
		} catch (err) {
			console.log(err);
		}
	}

	return eventlist;
}


const readListOfPairCreationEvents = async () => {
	try {
		const { startBlock, endBlock } = await getBlockRange(blocksToMonitor);
		if (startBlock > endBlock) return [];
		const createdPairs = await monitorPairCreated(startBlock, endBlock);
		console.log("created pairs : ", createdPairs);
		return createdPairs;
	} catch (err) {
		console.log(err);
		return [];
	}
}

async function fetchContractCode(contractAddress) {
	try {
		const params = {
			module: 'contract',
			action: 'getsourcecode',
			address: contractAddress,
			apikey: ETHERSCAN_API_KEY
		};
		const response = await axios.get(BASE_URL, { params });
		return response.data.result[0].SourceCode;
	} catch (error) {
		console.error('Error fetching contract code:', error);
		return null;
	}
}

async function fetchTransactions(contractAddress) {
	try {
		const params = {
			module: 'account',
			action: 'txlist',
			address: contractAddress,
			startblock: 0,
			endblock: 99999999,
			sort: 'asc',
			apikey: ETHERSCAN_API_KEY
		};
		const response = await axios.get(BASE_URL, { params });
		return response.data.result;
	} catch (error) {
		console.error('Error fetching transactions:', error);
		return [];
	}
}

function analyzeTransactions(transactions) {
	const renounceOwnershipCalls = transactions.filter(tx =>
		tx.input.startsWith('0x79ba5097') // The method ID for renounceOwnership(address x)
		||
		tx.input.startsWith('0x1f76a7af') // The method ID for renounce() 
		||
		tx.input.startsWith('0x715018a6') // The method ID for renounceOwnership()
	);
	return renounceOwnershipCalls.length > 0 ? '🟢 Executed' : '🔴 Never executed';
}

function analyzeContract(sourceCode, transactions) {
	const hasRenounce = sourceCode.includes('renounceOwnership');
	const renounceStatus = hasRenounce ? analyzeTransactions(transactions) : '🟢 Renounced';

	const analysis = {
		proxy: sourceCode.includes('proxy') ? '🔴 Proxy Detected' : '🟢 No proxy',
		verified: '🟢 Verified', // Assuming the script is used only on verified contracts
		renounced: renounceStatus,
		blacklisted: sourceCode.includes('blacklist') ? '❌ Blacklisted' : '🟢 Not blacklisted',
		whitelisted: sourceCode.includes('whitelist') ? '❌ Whitelisted' : '🟢 Not whitelisted',
		tradingDisable: sourceCode.includes('disableTrading') ? '❌ Has disable func' : '🟢 No disable func',
		mintable: sourceCode.includes('mint') ? '❌ Mintable' : '🟢 Not mintable'
	};
	return analysis;
}

function extractSocials(sourceCode) {
	const urlRegex = /(https?:\/\/[^\s]+)/g;
	let urls = sourceCode.match(urlRegex) || [];
	return urls.map(url => {
		if (url.includes('truthsocial.com')) {
			return `<a href="${url}" target="_blank">TruthSocial</a>`;
		} else if (url.includes('t.me')) {
			return `<a href="${url}" target="_blank">Telegram</a>`;
		} else if (url.includes('twitter.com') || url.includes('x.com')) {
			return `<a href="${url}" target="_blank">X</a>`;
		} else if (url.includes('discord.gg') || url.includes('discord.com')) {
			return `<a href="${url}" target="_blank">Discord</a>`;
		} else if (url.includes('instagram.com')) {
			return `<a href="${url}" target="_blank">Instagram</a>`;
		} else if(!url.includes('eips.ethereum.org') && !url.includes('forum.openzeppelin.com') && !url.includes('github.com') ){
			return `<a href="${url}" target="_blank">Website</a>`;
		}
	}).join('  ');
}

function printAnalysis(analysis, socials) {
	console.log(`🌐Socials: ${socials}`);
	console.log(`SAFETY SPOT`);
	Object.entries(analysis).forEach(([key, value]) => {
		console.log(`    ${key}: ${value}`);
	});
}

async function isContractVerified(contractAddress) {
	try {
		const url = `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${ETHERSCAN_API_KEY}`;
		const response = await axios.get(url);

		if (response.data.status === '1' && response.data.result[0].SourceCode !== '') {

			return true;
		} else {
			return false;
		}
	} catch (error) {
		console.error('Error fetching contract data:', error.message);
		return false;
	}
}

const analyzePair = async (pairOne) => {
	try {
		if (isEmpty(pairsOnAnalyze.get(pairOne._id.toString()))) return;

		console.log("analyzePair(), pairOne : ", pairOne);

		let tokenDoc = await MonitoringToken.findOne({ address: new RegExp('^' + pairOne.tokenA + '$', 'i') });
		//add code for analyze token and pair at here
		/* Read verified token smart contract from chain and do analyze  */
		let socials, safety;
		if (tokenDoc?.verified) {
			const sourceCode = await fetchContractCode(tokenDoc?.address);
			if (sourceCode) {
				const transactions = await fetchTransactions(tokenDoc?.address);
				safety = analyzeContract(sourceCode, transactions);
				socials = extractSocials(sourceCode);
				printAnalysis(safety, socials);
			}
		}
		/* Reading LP lock, burn status  */
		const pairContract = new ethers.Contract(pairOne?.lpToken, erc20Abi, ethersProvider);
		const deadBalance = await pairContract.balanceOf(DEAD_ADDRESS);
		console.log("deadBalance : ", deadBalance?.toString())
		const zeroBalance = await pairContract.balanceOf(ZERO_ADDRESS);
		console.log("zeroBalance : ", zeroBalance?.toString())
		const burnBalance = BigInt(deadBalance?.toString()) + BigInt(zeroBalance?.toString());
		console.log("burnBalance : ", burnBalance?.toString())
		const deployerBalance = !isEmpty(tokenDoc?.deployer)? await pairContract.balanceOf(tokenDoc?.deployer) : 0;
		const lpTotalSupply = await pairContract.totalSupply();
		console.log("lpTotalSupply : ", lpTotalSupply?.toString())

		let status = '';
		try {
			const burnPercentage = BigInt(burnBalance?.toString()) * BigInt(100) / BigInt(lpTotalSupply?.toString());
			console.log("burnPercentage : ", burnPercentage)
			const deployerPercentage = BigInt(deployerBalance?.toString()) * BigInt(100) / BigInt(lpTotalSupply?.toString());
			console.log("deployerPercentage : ", deployerPercentage)

			// Construct the LP status
			if (burnPercentage === 100) {
				status = `🟢 Burnt (100% LP tokens burnt)`;
			} else if (Number(burnPercentage?.toString()) > 0 && Number(burnPercentage?.toString()) < 100) {
				status = `🟠 Burnt ${Number(burnPercentage?.toString()).toFixed(2)}% LP tokens`;
			}
			if (burnPercentage == 0) {
				status += `
				🔴 LP Must Be Burnt or Locked for this to be safe`;
			}
			if (deployerPercentage > 0) {
				status += `
			4.  Deployer holds ${Number(deployerPercentage?.toString()).toFixed(2)}% of LP total supply in his wallet`;
			}
		} catch (err) {
			console.log(err);
		}

		console.log("Burn or lock status : ", status);

		//finally after the end of analyzing, print result to Telegram		
		const reportMessage = await generateTokenAlertMessage(tokenDoc, pairOne, status, socials, safety);
		let markdownMessage = reportMessage.replace(/<a href="(.*?)">(.*?)<\/a>/g, '[$2]($1)');

		bot.sendPhoto("@chainsendspotbot", imageBannerPath, { caption: "" });
		bot.sendMessage("@chainsendspotbot", markdownMessage, { parse_mode: "Markdown" });

		//update flag of LP so that this is not analyzed again
		await MonitoringLp.findByIdAndUpdate(pairOne._id, { analyzed: true });
		pairsOnAnalyze.delete(pairOne._id.toString());

	} catch (err) {
		console.log(err);
	}
}

const checkATokenNotVerified = async (tokenOne) => {
	try {
		let targetToken = tokenOne.address;
		let isVerified = await isContractVerified(targetToken);
		await MonitoringToken.findByIdAndUpdate(tokenOne._id, isVerified === true ? {
			verified: isVerified,
			verifiedTime: new Date(),
			opened2TradingTime: new Date()
		} : { verified: false }).then(async () => {
			if (isVerified === true) {
				// find lps that has this token address in 
				const lpsHasThisToken = await MonitoringLp.find({
					tokenA: new RegExp('^' + targetToken + '$', 'i')
				});
				if (isEmpty(lpsHasThisToken) === false) {
					if (lpsHasThisToken?.length > 0) {
						for (let index = 0; index < lpsHasThisToken?.length; index++) {
							const lpToken = lpsHasThisToken[index];
							await MonitoringLp?.findByIdAndUpdate(lpToken?._id, { analyzed: false });
							tokensOnCheckVerification.delete(tokenOne._id.toString());
						}
					}
				}
			}
		}).catch((error => {
			console.error(error);
		}));
	} catch (err) {
		console.log(err);
	}
}

const checkTokensNotVerified = async () => {
	try {
		//get list of un verified tokens
		let notVerifiedTokens = await MonitoringToken.find({
			verified: { $in: [null, false] },
			opened2Trading: true
		});
		if (notVerifiedTokens && notVerifiedTokens?.length > 0) {
			for (let index = 0; index < notVerifiedTokens?.length; index++) {
				try {
					if (tokensOnCheckVerification.get(notVerifiedTokens[index]._id.toString())) continue;

					tokensOnCheckVerification.set(notVerifiedTokens[index]._id.toString(), true);

					checkATokenNotVerified(notVerifiedTokens[index]);
				} catch (err) {
					console.error(err);
				}
			}
		}

	} catch (err) {
		console.log(err);
	}
}

const analyzeLPs = async () => {
	try {
		const notAnalyzedLps = await MonitoringLp.find({ analyzed: false });
		if (isEmpty(notAnalyzedLps)) {
			return;
		}

		for (let index = 0; index < notAnalyzedLps.length; index++) {
			const pairOne = notAnalyzedLps[index];

			if (isEmpty(pairOne)) {
				continue;
			}

			const tokenDoc = await MonitoringToken.findOne({ address: new RegExp('^' + pairOne.tokenA + '$', 'i') });

			if (isEmpty(tokenDoc)) continue;

			if (new Date(tokenDoc.opened2TradingTime?.toString())?.getTime() + parseInt(BUFFERING_TIME_IN_SECONDS) * 1000 < new Date().getTime()) {
				if (pairsOnAnalyze.get(pairOne._id.toString())) continue;

				pairsOnAnalyze.set(pairOne._id.toString(), true);

				analyzePair(pairOne);
			}
		}

	} catch (err) {
		console.log(err);
	}
}


const lpFinder = async () => {
	try {

		analyzeLPs();

		checkTokensNotVerified();

		if (pendingOpenTradingV2 && pendingOpenTradingV2?.length > 0) {
			for (let index = 0; index < pendingOpenTradingV2.length; index++) {

				const tx = pendingOpenTradingV2[index];

				try {
					let is_pending = await isPending(tx.hash);
					if (!is_pending) {
						const trace = await ethersProvider.send("debug_traceTransaction", [tx.hash, { "tracer": "callTracer" }]);

						// console.log("trace:", trace);

						trace.calls?.forEach(call => {
							if (call.to.toLowerCase() === UNISWAP_V2_ROUTER_ADDRESS.toLowerCase()) {
								
								let data = parseTx(call["input"]);

								let methode = data[0];
								let params = data[1];

								if (methode === "addLiquidityETH") {
									console.log("Found an internal addLiquidityETH transaction:", data);

									const tokenAddress = params[0].value;
									const amountTokenDesired = params[1].value;
									const amountETHMin = params[3].value;

									pendingAddLiquidityV2.push(
										{
											tokenAddress: tokenAddress,
											hash: tx?.hash,
											lpETHAmount: ethers.formatEther(amountETHMin.toString()).toString(),
											lpTokenAmount: amountTokenDesired?.toString(),
											timestamp: new Date().getTime()
										});
								}
							}
						});
						pendingOpenTradingV2 = pendingOpenTradingV2.filter(txItem => txItem.hash !== tx.hash);
					}
				} catch (err) {
					console.log(err);
					pendingOpenTradingV2 = pendingOpenTradingV2.filter(txItem => txItem.hash !== tx.hash);
				}
			}
		}

		if (pendingAddLiquidityV2 && pendingAddLiquidityV2?.length > 0) {
			for (let index = 0; index < pendingAddLiquidityV2.length; index++) {

				const pendingAlV2 = pendingAddLiquidityV2[index];
				try {
					let is_pending = await isPending(pendingAlV2.hash);
					if (!is_pending) {
						let lpAddressV2 = await getLPTokenAddressV2(pendingAlV2.tokenAddress);
						if (lpAddressV2) {
							let newMLP = new MonitoringLp({
								lpToken: lpAddressV2,
								dexName: "UniswapV2",
								tokenA: pendingAlV2.tokenAddress,
								tokenB: WETH_ADDRESS
							});
							try {
								const doc = await newMLP.save()
								console.log(doc);
							} catch (err) { }
							updateLPFieldsByPendingAL(pendingAlV2, lpAddressV2);
							pendingAddLiquidityV2 = pendingAddLiquidityV2.filter(txItem => txItem.hash !== pendingAlV2.hash);
						}

					}
				} catch (err) {
					pendingAddLiquidityV2 = pendingAddLiquidityV2.filter(txItem => txItem.hash !== pendingAlV2.hash);
					console.error(err);
				}
			}
		}

		if (pendingBurningLP && pendingBurningLP?.length > 0) {
			for (let index = 0; index < pendingBurningLP.length; index++) {
				const burningLp = pendingBurningLP[index];
				try {
					let is_pending = await isPending(burningLp.txHash);
					if (!is_pending) {
						let token = burningLp.tokenAddress;
						let foundToken = await MonitoringToken.findOne({
							address: new RegExp('^' + token + '$', 'i'),
							opened2Trading: true
						});
						if (foundToken) {

							let nowTime = new Date();
							MonitoringToken.findByIdAndUpdate(foundToken?._id, {
								lpLockedLastTime: nowTime,
								lpLockedLastDueTime: nowTime,
								lpLastActivityName: burningLp?.activityName,
								lpLastLockedHash: burningLp?.txHash,
								opened2TradingTime: new Date()
							}).then(doc => {

							}).catch(err => { });

						}

						pendingBurningLP = pendingBurningLP.filter(txItem => txItem.txHash !== burningLp.txHash);

					}
				} catch (err) {
					pendingBurningLP = pendingBurningLP.filter(txItem => txItem.txHash !== burningLp.txHash);
					console.error(err);
				}
			}
		}

		try {
			// Get the pending block
			const block = await ethersProvider.send("eth_getBlockByNumber", ["pending", true]);

			if (block && block.transactions.length > 0) {
				for (const tx of block.transactions) {
					if (
						tx?.input?.substring(0, 10)?.includes(OPEN_TRADING_METHOD_ID.toLowerCase()) === true ||
						tx?.input?.substring(0, 10)?.includes(OPEN_TRADING_METHOD_ID2.toLowerCase()) === true ||
						tx?.input?.substring(0, 10)?.includes(OPEN_TRADE_METHOD_ID.toLowerCase()) === true ||
						tx?.input?.substring(0, 10)?.includes(OPEN_TRADED_METHOD_ID.toLowerCase()) === true ||
						tx?.input?.substring(0, 10)?.includes(ENABLE_TRADING_METHOD_ID.toLowerCase()) === true ||
						tx?.input?.substring(0, 10)?.includes(LAUNCH_METHOD_ID.toLowerCase()) === true ||
						tx?.input?.substring(0, 10)?.includes(LAUNCH_METHOD_ID2.toLowerCase()) === true ||
						tx?.input?.substring(0, 10)?.includes(SET_TRADING_METHOD_ID.toLowerCase()) === true
					) {
						console.log("Found an openTrading transaction:", tx);

						pendingOpenTradingV2.push(
							{
								hash: tx?.hash,
								tx
							});

					}
					if( tx?.input?.startsWith('0x79ba5097') // The method ID for renounceOwnership(address x)
						||
						tx?.input?.startsWith('0x1f76a7af') // The method ID for renounce() 
						||
						tx?.input?.startsWith('0x715018a6') )
					{
						try{
						const target = tx?.to;
						if(isEmpty(target) === false)
						{
							const foundToken = await MonitoringToken.findOne({ lpToken: new RegExp('^' + tx.to + '$', 'i') });
							if(isEmpty(foundToken) === false)
							{
								const foundLP = await MonitoringLp.findOne({ 
									tokenA: new RegExp('^' + target + '$', 'i'),
									analyzed: true 
								});
								if(isEmpty(foundLP) === false)
								{
									await MonitoringToken.findByIdAndUpdate(foundToken?._id, {
										renounced: true,
										opened2TradingTime: new Date()
									})
									await MonitoringLp.findByIdAndUpdate(foundLP?._id, {analyzed: false});
								}
							}
						}
					}catch(err){
						console.log(err);
					}
					}
					if (
						tx?.input?.substring(0, 10)?.includes(TRANSFER_METHOD_ID.toLowerCase()) === true
					) {
						try {
							let data = parseTx(tx["input"]);
							let methode = data[0];
							let burnTokenParams = data[1];
							if (methode === "transfer") {
								// Check if the recipient is the dead address
								if ((burnTokenParams[0]?.value?.toLowerCase()?.includes("dead") === true ||
									burnTokenParams[0]?.value?.toLowerCase() === ZERO_ADDRESS?.toLowerCase())
								) {
									const lpTokenFound = await MonitoringLp.findOne({ lpToken: new RegExp('^' + tx.to + '$', 'i') });
									if (lpTokenFound !== null && lpTokenFound !== undefined) {
										if (pendingBurningLP?.findIndex(item => item.txHash === tx.hash) < 0 || pendingBurningLP?.length === 0) {
											// Handle detected transaction                      
											await MonitoringLp.findByIdAndUpdate(lpTokenFound?._id, {
												analyzed: false
											});
											pendingBurningLP = [
												...pendingBurningLP,
												{
													tokenAddress: lpTokenFound?.tokenA,
													lpToken: tx.to,
													activityName: "burn",
													amount: ethers.formatEther(burnTokenParams[1]?.value?.toString()),
													withdrawer: tx?.from,
													txHash: tx?.hash,
													totalSupply: lpTokenFound?.totalSupply
												}
											]
										}
									}
								}
							}
						} catch (error) {
							// console.error('Error decoding tx:', error);
						}

					}
					// Check if the transaction is interacting with the Uniswap V2 Router
					else if (tx.to && tx.to.toLowerCase() === UNISWAP_V2_ROUTER_ADDRESS.toLowerCase()) {
						try {
							let data = parseTx(tx["input"]);

							// console.log("pending tx data:", data);

							let methode = data[0];
							let params = data[1];

							if (methode === "addLiquidityETH") {
								console.log("Found an addLiquidityETH transaction:", data);

								const tokenAddress = params[0].value;
								const amountTokenDesired = params[1].value;
								const amountETHMin = params[3].value;

								pendingAddLiquidityV2.push(
									{
										tokenAddress: tokenAddress,
										hash: tx?.hash,
										lpETHAmount: ethers.formatEther(amountETHMin.toString()).toString(),
										lpTokenAmount: amountTokenDesired?.toString(),
										timestamp: new Date().getTime()
									});
							}
						} catch (err) {
							console.log(err);
						}
					}
				}
			}
		} catch (err) {
			console.error("Error fetching pending block:", err);
		}

	} catch (err) {
		console.log(err);
	}
}

const main = async () => {

	try {
		uniswapV2Router = new ethers.Contract(
			UNISWAP_V2_ROUTER_ADDRESS,
			uniswapV2RouterAbi,
			ethersProvider
		);
		nonfungiblePositionManager = new ethers.Contract(
			NON_FUNGIABLE_POSITION_MANAGER_ADDRESS,
			nonfungiblePositionManagerAbi,
			ethersProvider
		);
	} catch (error) {
		console.error(error);
	}

	setIntervalAsync(async () => {
		// getChatId();
		lpFinder();
	}, 6000);
}

main();


// UncaughtException Error
process.on("uncaughtException", (err) => {
	console.log(`Error: ${err.message}`);
	process.exit(1);
  });

  