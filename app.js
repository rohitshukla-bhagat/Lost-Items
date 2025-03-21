//? Extaract the required packages , variables and schemas...
const express = require("express");
require("dotenv").config();
const app = express();
const port = 8080;
const mongoose = require("mongoose");
const item = require("./modules/itemSchema.js");
const user = require("./modules/userSchema.js");
const response = require("./modules/responseSchema.js");
const record = require("./modules/recordsSchema.js");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const multer = require("multer");
const dburl = process.env.ATLASDB_URL;

//? Establish session for store the current logged in user ID

const store = MongoStore.create({
  mongoUrl: dburl,
  crypto: {
    secret: process.env.SECRET_KEY,
  },
});

store.on("error", () => {
  console.log("Session Store Error", err);
});

app.use(
  session({
    store,
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: true,
  })
);

//? Calling the funtions for connect the database
main()
  .then(() => {
    console.log("Connection Successful !");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(dburl);
}

//? Middlewares for the required NPM packages
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "/public")));
app.engine("ejs", ejsMate);

//? Set up the multer package for storing the image binary data in MongoDB
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

//? The path of landing page
app.get("/", (req, res) => {
  res.render("items/index.ejs");
});

//? Path for login
app.get("/login/form", (req, res) => {
  res.render("items/login.ejs");
});

//? Path for registration form
app.get("/register", (req, res) => {
  res.render("items/register.ejs");
});

//? The root for all items page
app.get("/home", async (req, res) => {
  try {
    const itemArray = [];
    let items = await item.find({});
    for (let item of items) {
      if (item.lost == true) {
        itemArray.push(item);
      }
    }
    res.render("items/home.ejs", { itemArray });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving items.");
  }
});

//? Check the user login data is in the database or not
app.post("/login", async (req, res) => {
  let { email, password } = req.body.user;
  if (await user.findOne({ email: email, password: password })) {
    const savedUser = await user.findOne({ email: email, password: password });
    req.session.userId = savedUser._id;
    res.redirect("/home");
  } else {
    res.send(
      `<script>alert("Invalid Username or Password"); window.location.href = "/login/form";</script>`
    );
  }
});

//? Store the registered user data in database
app.post("/register", async (req, res) => {
  let { username } = req.body.user;
  if (await user.findOne({ username: username })) {
    res.send(
      `<script>alert("Username already exists"); window.location.href = "/register";</script>`
    );
  } else {
    const newUser = new user(req.body.user);
    const savedUser = await newUser.save();
    req.session.userId = savedUser._id;
    res.redirect("/home");
  }
});

//? Functionality for the searched item on the all item page
app.post("/search", async (req, res) => {
  let { search } = req.body;
  const itemArray = [];
  let searchKeywords = [];
  let items = await item.find({});
  for (let item of items) {
    const word1 = item.name.toLowerCase().split(" ");
    searchKeywords.push(...word1);
    const word2 = item.description.toLowerCase().split(" ");
    searchKeywords.push(...word2);
    const word3 = item.location.toLowerCase().split(" ");
    searchKeywords.push(...word3);
    for (let i = 0; i < searchKeywords.length; i++) {
      if (searchKeywords[i] == search) {
        itemArray.push(item);
        break;
      }
    }
    searchKeywords = [];
  }

  res.render("items/home.ejs", { itemArray });
});

//? Path for the all registered users in the website
app.get("/users", async (req, res) => {
  const users = [];
  const allUsers = await user.find({});
  for (let i = 0; i < allUsers.length; i++) {
    if (allUsers[i].id != req.session.userId) {
      users.push(allUsers[i]);
    }
  }

  res.render("items/users.ejs", { users });
});

//? Path for the another user user details and items
app.get("/users/:id", async (req, res) => {
  const itemsArray = [];
  const userId = req.params.id;
  const foundUser = await user.findById(userId);
  for (let i = 0; i < foundUser.lostitems.length; i++) {
    const foundItem = await item.findById(foundUser.lostitems[i]);
    itemsArray.push(foundItem);
  }
  let path = "uncheck";
  res.render("items/dashboard.ejs", { foundUser, itemsArray, path });
});

//? Path for render the page of upload lost item form
app.get("/upload/lost", (req, res) => {
  res.render("items/uploadLost.ejs");
});

//? Path for render the page of upload found item form
app.get("/upload/found", (req, res) => {
  res.render("items/uploadFound.ejs");
});

//? Store the submitted lost item detail in DB
app.post("/add/lost", upload.single("image"), async (req, res) => {
  try {
    const userId = req.session.userId;
    const foundUser = await user.findById(userId);

    const newItem = new item({
      name: req.body.item.title,
      description: req.body.item.description,
      location: req.body.item.location,
      contact: Number(req.body.item.number),
      date: new Date(req.body.item.date),
      image: {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      },
    });

    const savedItem = await newItem.save();
    foundUser.lostitems.push(savedItem);
    await foundUser.save();
    const allItems = await item.find({});
    const itemArray = [];
    const titleCheck = newItem.name.split(" ");
    for (let data of titleCheck) {
      for (let itm of allItems) {
        const itemsTitle = itm.name.split(" ");
        const itemsDes = itm.description.split(" ");
        const reslt1 = itemsTitle.includes(data);
        const reslt2 = itemsDes.includes(data);
        const check = itemArray.includes(itm);
        if ((reslt1 == true || reslt2 == true) && check == false) {
          itemArray.push(itm);
        }
      }
    }
    count = 0;
    res.render("items/home.ejs", { itemArray });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error saving item");
  }
});

//? Store the submitted found item detail in DB
app.post("/add/found", upload.single("image"), async (req, res) => {
  try {
    const userId = req.session.userId;
    const foundUser = await user.findById(userId);

    const newItem = new item({
      name: req.body.item.title,
      description: req.body.item.description,
      location: req.body.item.location,
      contact: Number(req.body.item.number),
      date: new Date(req.body.item.date),
      image: {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      },
    });

    const savedItem = await newItem.save();
    foundUser.founditems.push(savedItem);
    await foundUser.save();
    const allItems = await item.find({});
    const itemArray = [];
    const titleCheck = newItem.name.split(" ");
    for (let data of titleCheck) {
      for (let itm of allItems) {
        const itemsTitle = itm.name.split(" ");
        const itemsDes = itm.description.split(" ");
        const reslt1 = itemsTitle.includes(data);
        const reslt2 = itemsDes.includes(data);
        const check = itemArray.includes(itm);
        if ((reslt1 == true || reslt2 == true) && check == false) {
          itemArray.push(itm);
        }
      }
    }
    count = 0;
    res.render("items/home.ejs", { itemArray });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error saving item");
  }
});

//? Render the item view page
app.get("/item/:id", async (req, res) => {
  try {
    let foundUser;
    let { id } = req.params;
    if (
      (await user.findOne({ lostitems: id })) ||
      (await user.findOne({ founditems: id }))
    ) {
      foundUser = await user.findOne({ lostitems: id });
      if (!foundUser) {
        foundUser = await user.findOne({ founditems: id });
      }
    }
    const foundItem = await item.findById(req.params.id);
    if (foundUser) {
      if (foundUser._id == req.session.userId) {
        res.redirect("/dashboard?&path=check");
      } else {
        res.render("items/item.ejs", { foundItem, foundUser });
      }
    } else {
      res.send(
        `<script>alert("Owner Not Found !"); window.location.href = "/home";</script>`
      );
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving item.");
  }
});

//? Render the response form
app.get("/response/:id", async (req, res) => {
  let { id } = req.params;
  res.render("items/response.ejs", { id });
});

//? Store the response details in DB
app.post("/response/:id", upload.single("image"), async (req, res) => {
  try {
    let foundUser;
    const userID = req.session.userId;
    const currentUser = await user.findById(userID);
    let { id } = req.params;
    if (await user.findOne({ lostitems: id })) {
      foundUser = await user.findOne({ lostitems: id });
    } else {
      foundUser = await user.findOne({ founditems: id });
    }
    const newResponse = new response({
      name: req.body.item.title,
      description: req.body.item.description,
      location: req.body.item.location,
      contact: Number(req.body.item.number),
      date: new Date(req.body.item.date),
      image: {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      },
    });
    const newRecord = new record({
      image: {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      },
      senderUsername: currentUser.username,
      senderEmail: currentUser.email,
      ownerUsername: foundUser.username,
      receiverEmail: foundUser.email,
      status: "response",
    });
    await newRecord.save();
    const savedResponse = await newResponse.save();
    foundUser.responses.push(savedResponse);
    await foundUser.save();
    res.redirect("/home?toastMessage=Response Send Successfully !");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error saving item");
  }
});

//? Path for render the current logged in user details
app.get("/dashboard", async (req, res) => {
  const itemsArray = [];
  let foundUser;
  let { path, userid } = req.query;
  if (path == "check") {
    const userId = req.session.userId;
    foundUser = await user.findById(userId);
  } else {
    foundUser = await user.findById(userid);
  }
  for (let i = 0; i < foundUser.lostitems.length; i++) {
    const foundItem = await item.findById(foundUser.lostitems[i]);
    itemsArray.push(foundItem);
  }
  res.render("items/dashboard.ejs", { foundUser, itemsArray, path });
});

//? Render the form for editting the details of the current logged in user
app.get("/dashboard/profile", async (req, res) => {
  const userId = req.session.userId;
  const currUser = await user.findById(userId);
  res.render("items/profile.ejs", { currUser });
});

//? Save the updated user detail in the database
app.post("/profile/:id", async (req, res) => {
  let { username, name, email } = req.body.user;
  await user.findByIdAndUpdate(req.params.id, {
    username: username,
    name: name,
    email: email,
  });
  res.redirect("/dashboard?path=check");
});

//? Logic for store record when user click "mark as found" on user dashboard page
app.post("/found/record/:id", async (req, res) => {
  let { username } = req.body;
  let { id } = req.params;
  const foundItem = await item.findById(id);
  const userID = req.session.userId;
  const receiver = await user.findOne({ username: username.trim() });
  if (!receiver) {
    res.send(
      `<script>alert("Username Not Found !"); window.location.href = "/dashboard?path=check";</script>`
    );
  } else {
    const currentUser = await user.findById(userID);
    const newRecord = new record({
      image: foundItem.image,
      senderUsername: receiver.username,
      senderEmail: receiver.email,
      ownerUsername: currentUser.username,
      receiverEmail: currentUser.email,
      status: "found",
    });
    await newRecord.save();
    res.redirect(`/found/${id}`);
  }
});

//? Logic for marked the item found in user dashboard page
app.get("/found/:id", async (req, res) => {
  let { id } = req.params;
  await item.findByIdAndUpdate(id, { lost: false });
  res.redirect("/dashboard?path=check&toastMessage=Item Marked as Found!");
});

//? Render the found items page of current logged in user
app.get("/dashboard/found", async (req, res) => {
  const itemsArray = [];
  let foundUser;
  let { path, userid } = req.query;
  if (path == "check") {
    const userId = req.session.userId;
    foundUser = await user.findById(userId);
  } else {
    foundUser = await user.findById(userid);
  }
  for (let i = 0; i < foundUser.founditems.length; i++) {
    const foundItem = await item.findById(foundUser.founditems[i]);
    itemsArray.push(foundItem);
  }

  res.render("items/dashFound.ejs", { foundUser, itemsArray, path });
});

//? Render the resposes page of current logged in user
app.get("/dashboard/response", async (req, res) => {
  const itemsArray = [];
  let { path } = req.query;
  const userId = req.session.userId;
  const foundUser = await user.findById(userId);
  for (let i = 0; i < foundUser.responses.length; i++) {
    const foundItem = await response.findById(foundUser.responses[i]);
    itemsArray.push(foundItem);
  }
  res.render("items/dashResponse.ejs", { foundUser, itemsArray, path });
});

//? Render the form for updating the items details
app.get("/item/:id/update", async (req, res) => {
  let foundItem = await item.findById(req.params.id);
  res.render("items/update.ejs", { foundItem });
});

//? Function to save the updated item details in the database
app.put("/update/:id", upload.single("image"), async (req, res) => {
  try {
    await item.findByIdAndUpdate(req.params.id, {
      name: req.body.item.title,
      description: req.body.item.description,
      location: req.body.item.location,
      contact: Number(req.body.item.number),
      date: new Date(req.body.item.date),
      image: {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      },
    });
    res.redirect(
      "/dashboard?path=check&toastMessage=Item Updated Successfully !"
    );
  } catch (error) {
    console.error(error);
    res.status(500).send("Error saving item");
  }
});

//? Logic for deleting the items on the user dashboard page
app.get("/item/:id/delete", async (req, res) => {
  let { id } = req.params;
  let userId = req.session.userId;
  let foundItem = await item.findById(id);
  if (!foundItem) {
    foundItem = await response.findById(id);
    await user.findByIdAndUpdate(userId, { $pull: { responses: id } });
    await response.findByIdAndDelete(id);
    res.redirect(
      "/dashboard?path=check&toastMessage=Respond Deleted Successfully !"
    );
  } else {
    if (await user.findOne({ founditems: id })) {
      await user.findByIdAndUpdate(userId, { $pull: { founditems: id } });
    } else if (await user.findOne({ lostitems: id })) {
      await user.findByIdAndUpdate(userId, { $pull: { lostitems: id } });
    }
    await item.findByIdAndDelete(id);
    res.redirect(
      "/dashboard?path=check&toastMessage=Item Deleted Successfully!"
    );
  }
});

app.get("/records", async (req, res) => {
  const recordsArray = await record.find({});
  res.render("records/record.ejs", { recordsArray });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
