require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

app.use(
  cors({
    origin: ["http://localhost:5173", "https://life-drops-b7147.web.app"],
  })
);
app.use(express.json());

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
    // await client.connect();

    const userCollection = client.db("registerDB").collection("userCollection");

    const donationRequestCollection = client
      .db("requestDB")
      .collection("donationRequest");

    app.get("/donationRequest", async (req, res) => {
      const { requesterEmail, status } = req.query;
      const query = {};
      if (status && status !== "All") {
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

    app.get("/donationRequest/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const donation = await donationRequestCollection.findOne(query);
      res.send(donation);
    });

    app.post("/users", async (req, res) => {
      const newUsers = req.body;
      const result = await userCollection.insertOne(newUsers);
      res.send(result);
    });
    app.post("/donationRequest", async (req, res) => {
      const newRequest = req.body;
      const result = await donationRequestCollection.insertOne(newRequest);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      try {
        const { blood, district, upazila, email, status } = req.query;
        const query = {};
        if (blood) {
          query.blood = blood;
        }
        if (district) {
          query.district = district;
        }
        if (upazila) {
          query.upazila = upazila;
        }
        if (email) {
          query.email = email;
        }
        if (status && status !== "All") {
          query.status = status;
        }
        const results = await userCollection.find(query).toArray();
        res.json(results);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching data" });
      }
    });
    app.get("/allusers", async (req, res) => {
      try {
        const { email } = req.query;
        const query = {};
        if (email) {
          query.email = email;
        }
        const results = await userCollection.findOne(query);
        res.json(results);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching data" });
      }
    });

    app.put("/donationRequest/:id", async (req, res) => {
      const id = req.params.id;
      const updateRequest = req.body;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedRequest = {
        $set: {
          name: updateRequest.name,
          blood: updateRequest.blood,
          district: updateRequest.district,
          upazila: updateRequest.upazila,
          hospital: updateRequest.hospital,
          address: updateRequest.address,
          date: updateRequest.date,
          time: updateRequest.time,
          message: updateRequest.message,
        },
      };
      const result = await donationRequestCollection.updateOne(
        query,
        updatedRequest,
        options
      );
      res.send(result);
    });

    app.patch("/donationRequest/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const assignment = await donationRequestCollection.findOne(query);
      const modify = req.body;
      const result = await donationRequestCollection.updateOne(query, {
        $set: modify,
      });
      res.send(result);
    });
    app.delete("/donationRequest/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const donation = await donationRequestCollection.findOne(query);
      const result = await donationRequestCollection.deleteOne(query);
      res.send(result);
    });

    //   await client.db("admin").command({ ping: 1 });
    //   console.log(
    //     "Pinged your deployment. You successfully connected to MongoDB!"
    //   );
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
