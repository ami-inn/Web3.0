/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import React, { Children, useEffect, useState } from "react";
import { ethers } from "ethers";

import { contractABI, contractAddress } from "../utils/constants";

export const TransactionContext = React.createContext();

const { ethereum } = window;

const createEthereumContract = () => {
  const provider = new ethers.providers.Web3Provider(ethereum); // passing the ethereum window object
  const signer = provider.getSigner(); //we geth the getsigner
  const transactionsContract = new ethers.Contract(
    contractAddress,
    contractABI,
    signer
  ); //we can fetch the contract

  console.log(provider, signer, transactionsContract, "transaction contract");

  return transactionsContract;
};

export const TransactionProvider = ({ children }) => {
  // every transaction provider needs to get one thing from the props and that thing is children

  const [formData, setformData] = useState({
    addressTo: "",
    amount: "",
    keyword: "",
    message: "",
  });
  const [currentAccount, setCurrentAccount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [transactionCount, setTransactionCount] = useState(
    localStorage.getItem("transactionCount")
  );
  const [transactions, setTransactions] = useState([]);

  const handleChange = (e, name) => {
    setformData((prev) => ({ ...prev, [name]: e.target.value }));
  };

  const getAllTransactions = async () => {
    try {
      const transactionsContract = createEthereumContract();

      const availableTransactions =
        await transactionsContract.getAllTransactions();

      const structuredTransactions = availableTransactions.map(
        (transaction) => ({
          addressTo: transaction.receiver,
          addressFrom: transaction.sender,
          timestamp: new Date(
            transaction.timestamp.toNumber() * 1000
          ).toLocaleString(),
          message: transaction.message,
          keyword: transaction.keyword,
          amount: parseInt(transaction.amount._hex) / 10 ** 18,
        })
      );

      console.log(structuredTransactions, "structured transacctions");

      setTransactions(structuredTransactions);
    } catch (error) {
      console.log(error);
      throw new Error("No ethereum object");
    }
  };

  const checkIfWalletIsConnected = async () => {
    try {
      if (!ethereum) return alert("please install metamask");

      const accounts = await ethereum.request({ method: "eth_accounts" });
      console.log(accounts, "accounts");
      if (accounts.length) {
        setCurrentAccount(accounts[0]);
        // get alll transactions
        getAllTransactions();
      } else {
        console.log("no accont found");
      }
    } catch (error) {
      console.log(error, "error");
    }
  };

  const checkIfTransactionsExist = async () => {
    try {
      const transactionsContract = createEthereumContract();
      const currentTransactionCount =
        await transactionsContract.getTransactionCount();

      window.localStorage.setItem("transactionCount", currentTransactionCount);
    } catch (error) {
      console.log(error);
      throw new Error("No ethereum object");
    }
  };

  const connectWallet = async () => {
    try {
      if (!ethereum) return alert("please install metamask");

      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });

      setCurrentAccount(accounts[0]);
    } catch (error) {
      console.log("error", error);
      throw new Error("no ethereum object");
    }
  };

  const sendTransaction = async () => {
    try {
      if (!ethereum) return alert("please install metamask");

      const { addressTo, amount, keyword, message } = formData;

      const transactionsContract = createEthereumContract();
      const parsedAmount = ethers.utils.parseEther(amount); //convert to gwei or hexadecimal

      await ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: currentAccount,
            to: addressTo,
            gas: "0x5208", // 21000 gwei return in hexadecimal google hex to decimal
            value: parsedAmount._hex,
          },
        ],
      });

      //   to store the transaction
      const transactionHash = await transactionsContract.addToBlockChain(
        addressTo,
        parsedAmount,
        message,
        keyword
      );

      setIsLoading(true);
      console.log(`Loading - ${transactionHash.hash}`);
      await transactionHash.wait();
      console.log(`Success - ${transactionHash.hash}`);
      setIsLoading(false);

      const transactionsCount =
        await transactionsContract.getTransactionCount();

      setTransactionCount(transactionsCount.toNumber());
      window.reload()
    } catch (error) {
      console.log(error, "error");
    }
  };

  useEffect(() => {
    checkIfWalletIsConnected();
    checkIfTransactionsExist();
  }, []);

  return (
    <TransactionContext.Provider
      value={{
        transactions,
        isLoading,
        connectWallet,
        currentAccount,
        formData,
        setformData,
        handleChange,
        sendTransaction,
      }}
    >
      {/* we are wrapping the entire react application and all the data get here */}
      {/* it have to acces the value */}
      {children}
    </TransactionContext.Provider>
  );
};
