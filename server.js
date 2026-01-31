
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");
const fetch = require("node-fetch");
const rateLimit = require("express-rate-limit");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const limiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 1,
  message: { error: "⏳ Wait 5 minutes before next claim." }
});

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

app.post("/claim", limiter, async (req, res) => {
  try {
    const { address, captcha } = req.body;
    if (!ethers.isAddress(address)) {
      return res.status(400).json({ error: "Invalid address" });
    }

    const verify = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${process.env.RECAPTCHA_SECRET}&response=${captcha}`
    });

    const data = await verify.json();
    if (!data.success) {
      return res.status(403).json({ error: "Captcha failed" });
    }

    const tx = await wallet.sendTransaction({
      to: address,
      value: ethers.parseEther(process.env.FAUCET_AMOUNT)
    });

    res.json({ tx: tx.hash });
  } catch (err) {
    res.status(500).json({ error: "Transaction error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("POL FAUCET running on port " + PORT);
});
