require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
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
    const blogs = client.db("blogsDB").collection("blogs");

    const donationRequestCollection = client
      .db("requestDB")
      .collection("donationRequest");

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(403).send("Forbidden Access");
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send("Access Denied");
        }
        req.decoded = decoded;
        next();
      });
    };

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "Admin";
      if (!isAdmin) {
        return res.status(401).send({ message: "Unauthorized Access" });
      }
      next();
    };

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

    app.get("/users", verifyToken, async (req, res) => {
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
    app.get("/all-users", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const { status } = req.query;
        const query = {};
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
    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "Unauthorized Access" });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "Admin";
      }
      res.send({ admin });
    });
    app.get("/users/volunteer/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "Unauthorized Access" });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let volunteer = false;
      if (user) {
        volunteer = user?.role === "volunteer";
      }
      res.send({ volunteer });
    });
    app.get("/blogs", async (req, res) => {
      const { status } = req.query;
      const query = {};
      if (status && status !== "All") {
        query.status = status;
      }
      const blog = await blogs.find(query).toArray();
      res.json(blog);
    });
    app.get("/blogs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const blog = await blogs.findOne(query);
      res.send(blog);
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
    app.post("/blogs", verifyToken, verifyAdmin, async (req, res) => {
      const newBlogs = req.body;
      const result = await blogs.insertOne(newBlogs);
      res.send(result);
    });

    app.put("/users/:id", async (req, res) => {
      const id = req.params.id;
      const updateUserInfo = req.body;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedUserInfo = {
        $set: {
          name: updateUserInfo.name,
          photoURL: updateUserInfo.photoURL,
          blood: updateUserInfo.blood,
          district: updateUserInfo.district,
          upazila: updateUserInfo.upazila,
        },
      };
      const result = await userCollection.updateOne(
        query,
        updatedUserInfo,
        options
      );
      res.send(result);
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
      const target = await donationRequestCollection.findOne(query);
      const modify = req.body;
      const result = await donationRequestCollection.updateOne(query, {
        $set: modify,
      });
      res.send(result);
    });
    app.patch("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const target = await userCollection.findOne(query);
      const modify = req.body;
      const result = await userCollection.updateOne(query, {
        $set: modify,
      });
      res.send(result);
    });
    app.patch("/blogs/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const target = await blogs.findOne(query);
      const modify = req.body;
      const result = await blogs.updateOne(query, {
        $set: modify,
      });
      res.send(result);
    });
    app.delete("/donationRequest/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const donation = await donationRequestCollection.findOne(query);
      const result = await donationRequestCollection.deleteOne(query);
      res.send(result);
    });
    app.delete("/blogs/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const donation = await blogs.findOne(query);
      const result = await blogs.deleteOne(query);
      res.send(result);
    });

    // payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["cards"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
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
