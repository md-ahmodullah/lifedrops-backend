require("dotenv").config();
const express = require("express");
// const jwt = require("jsonwebtoken");
// const cookieParser = require("cookie-parser");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require("mongodb");

app.use(cors());
app.use(express.json());
// app.use(
//   cors({
//     origin: ["http://localhost:5173", "https://edulink-f2125.web.app"],
//     credentials: true,
//   })
// );
// app.use(cookieParser());
// const verifyToken = (req, res, next) => {
//   const token = req.cookies?.token;

//   if (!token) {
//     return res.status(401).send({ message: "Unauthorized Access!" });
//   }

//   jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
//     if (err) {
//       return res.status(401).send({ message: "Unauthorized Access!" });
//     }
//     next();
//   });
// };

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uqv4w.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const userCollection = client.db("registerDB").collection("userCollection");

    const donationRequestCollection = client
      .db("requestDB")
      .collection("donationRequest");

    app.get("/donationRequest", async (req, res) => {
      const { requesterEmail, status } = req.query;

      const query = {};

      if (status) {
        query.status = status;
      }

      if (requesterEmail) {
        query.requesterEmail = requesterEmail;
      }
      try {
        const myDonation = await donationRequestCollection
          .find(query)
          .toArray();
        res.json(myDonation);
      } catch (error) {
        console.error("Error fetching submissions:", error);
        res.status(500).send({ message: "Failed to fetch submissions" });
      }
    });

    app.post("/donationRequest", async (req, res) => {
      const newRequest = req.body;
      const result = await donationRequestCollection.insertOne(newRequest);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Life Drops : A Blood Donation Platform");
});

app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});
