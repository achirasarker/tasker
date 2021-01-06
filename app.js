// <---------REQUIRE MODULES------------>
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");
// <---------CREATE NEW EXPRESS APP------------>
const app = express();
// <---------SET VIEW ENGINE TO EJS------------>
app.set('view engine', 'ejs');
// <---------HAVE APP USE BODYPARSER + STATIC FILES------------>
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
// <---------CONNECT TO MONGOOSE------------>
mongoose.connect("mongodb+srv://admin-a:Test123@cluster0.5wbro.mongodb.net/todolistDB", { useUnifiedTopology: true, useNewUrlParser: true } );


// <---------SET UP ITEMS COLLECTION------------>
// **** create individual items schema ****
const itemsSchema = {
  name: String
};
// **** create individual items model ****
const Item = mongoose.model("Item", itemsSchema);

// **** create 1 new deafult items ****
const item1 = new Item({
  name: "Welcome to Tasker!"
});
const defaultItems = [item1];

// <---------SET UP LISTS COLLECTION------------>
// **** create list schema so that custom-titled lists can be made ****
const listSchema = {
  name: String,
  items: [itemsSchema]
};
// **** create list model ****
const List = mongoose.model("List", listSchema);

// <---------SET UP GET REQUEST FOR DEFAULT ROUTE------------>
app.get("/", function(req, res) {

  //go through list and if list is empty, new items are added then app.get("/") runs again
  //but this time it goes into the else path and thus rendering the list titled "Today"
  Item.find({}, function(err, foundItems){
    if (foundItems.length === 0) {
      Item.insertMany(defaultItems, function(err){
        if(err){
          console.log(err);
        } else {
          console.log("Successfully saved default items to todolistDB.");
        }
      });
      res.redirect("/");
    } else {
      res.render("list", {listTitle: "Today", newListItems: foundItems});
    }
  });

});

// <---------SET UP GET REQUEST FOR /ABOUT PAGE------------>
app.get("/about", function(req, res){
  res.render("about");
});

// <---------SET UP GET REQUEST FOR CUSTOME ROUTE e.g./work------------>
app.get("/:customType", function(req, res){
  const customType = _.capitalize(req.params.customType);
  //go through the list documents and check if name doesn't match any custom name
  //then create a new list, save it and redirect to custom url so that it can pass
  //through the else route and list page can be custom rendered
  List.findOne({name: customType}, function(err, foundList){
    if(!err) {
      if (!foundList) {
        //Create a new list
        const list = new List({
          name: customType,
          items: defaultItems
        });
        list.save();
        res.redirect("/" + customType);
      } else {
        //Show an existing list
        res.render("list", {listTitle: foundList.name, newListItems: foundList.items});
      }
    }
  });

});

// <---------SET UP POST REQUEST FOR /------------>
app.post("/", function(req, res){
  const itemName = req.body.newItem;
  const listName = req.body.list;

  const item = new Item({
    name: itemName
  });

  if(listName==="Today") {
      //save to default list
    item.save();
    res.redirect("/");
  } else {
    //if user searches custom list, find the custom list, then add new item to items in that listTitle
    //then redirect user back to custom page
    List.findOne({name: listName}, function(err, foundList){
      foundList.items.push(item);
      foundList.save();
      res.redirect("/" + listName);
    });
  }
});

// <---------SET UP POST REQUEST FOR /DELETE------------>
app.post("/delete", function(req, res){
  //using first part of the form in list.ejs, get the checked item's id and its' lists' name
  //if in default list, then remove by id and redirect to default page
  //if in custom list, use $PULL method to delete item from "items" array based on id and redirect to custom page
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;
  if(listName==="Today") {
    Item.findByIdAndRemove(checkedItemId, function(err){
      if(!err) {
        console.log("Successfully deleted checked item");
        res.redirect("/");
      }
    });
  } else {
    List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: checkedItemId}}}, function(err, foundList){
      if(!err) {
        res.redirect("/" + listName);
      }
    });
  }
});

// <---------GET APP TO LISTEN ON PORT 3000/HEROKU------------>
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server has started successfully.");
});
