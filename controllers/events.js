const Event = require("../models/events");
const User = require("../models/users");
const googleMapsClient = require("@google/maps").createClient({
  key: "AIzaSyAQsHfShuNXZCuQxQOSctFhjiiyM9pHX-0"
});

module.exports = {
  index: async (req, res) => {
    if (req.session.logged === true)
      try {
        const currentUser = await User.findById(req.session.usersDbId);
        const allEvents = await Event.find({})
          .populate("participants")
          .exec();
        const currentEvents = [];
        // console.log(currentUser, allEvents);
        for (let i = 0; i < allEvents.length; i++) {
          // console.log(allEvents[i].participants, currentUser);
          for (let j = 0; j < allEvents[i].participants.length; j++) {
            if (
              allEvents[i].participants[j]._id.toString() ===
              currentUser._id.toString()
            ) {
              currentEvents.push(allEvents[i]);
            }
          }
        }
        const results = await Promise.all(currentEvents);
        console.log(currentEvents, "current EVENTS DSDFSDF");
        res.render("events/index.ejs", {
          event: allEvents,
          userEvents: results,
          user: currentUser
        });
      } catch (err) {
        res.send(err);
      }
    else {
      res.redirect("/auth/login");
    }
  },

  new: (req, res) => {
    const currentUser = User.findById(req.session.usersDbId);
    if (req.session.logged === true) {
      res.render("events/new.ejs", {
        user: currentUser
      });
    } else {
      res.redirect("/auth/login");
    }
  },
  create: async (req, res) => {
    try {
      console.log(req.body);
      // Finding the user that is logged in with req.session.usersDbId
      const currentUser = await User.findById(req.session.usersDbId);
      // Creating owner property on body since we don't have it on the event creation page and setting it to the currentUser so we can get the name.
      req.body.owner = currentUser;
      // Creating the new event
      const newEvent = await Event.create(req.body);
      console.log(
        newEvent,
        "<--- newEvent BEFORE pushing owner into participants array"
      );
      newEvent.participants.push(currentUser);
      newEvent.save();
      console.log(
        newEvent,
        "<--- newEvent AFTER pushing owner into participants array"
      );
      res.redirect("/events");
    } catch (err) {
      res.render(err);
    }
  },
  joinEvent: async (req, res) => {
    try {
      const currentUser = await User.findById(req.session.usersDbId);
      // console.log(currentUser, "<---- currentUser");
      const foundEvent = await Event.findById(req.params.id);
      // console.log(foundEvent, "<---- foundEvent");
      foundEvent.participants.push(currentUser);
      foundEvent.save();
      req.session.joinMessage = "You are confirmed for this event!";
      res.redirect(`/events/${req.params.id}`);
      // console.log(foundEvent, "<---- foundEvent after user is put in");
    } catch (err) {
      res.send(err);
    }

    // When the user that is signed in clicks the yes button on the event show page
    // Add the user to that event's participants array
  },
  leaveEvent: async (req, res) => {
    // When the user clicks the cancel participation button,
    // I want to look through that event's participants for the signed in
    // user's ID and remove them from the participants array.
    console.log("cancel button pressed");
    try {
      const currentUser = await User.findById(req.session.usersDbId);
      // console.log(currentUser, "<---- currentUser");
      const foundEvent = await Event.findById(req.params.id);
      // console.log(foundEvent, "<---- foundEvent");
      const removeUser = await foundEvent.participants.indexOf(currentUser);
      foundEvent.participants.splice(removeUser, 1);
      foundEvent.save();
      req.session.joinMessage = "";
      res.redirect(`/events/${req.params.id}`);
      // console.log(foundEvent, "<---- foundEvent after user is put in");
    } catch (err) {
      res.send(err);
    }
  },
  show: async (req, res) => {
    if (req.session.logged === true)
      try {
        const currentUser = await User.findById(req.session.usersDbId);
        const foundEvent = await Event.findById(req.params.id)
          // populating the the owner object ID so that the owner name displays on show page
          .populate("owner")
          .populate("participants")
          .exec();

        let isAttending = false;
        for (let i = 0; i < foundEvent.participants.length; i++) {
          // console.log(allEvents[i].participants, currentUser);
          if (
            foundEvent.participants[i]._id.toString() ===
            currentUser._id.toString()
          ) {
            isAttending = true;
            req.session.joinMessage = "You are confirmed for this event!";
          }
        }
        googleMapsClient.geocode(
          {
            address: foundEvent.location
          },
          function(err, response) {
            if (!err) {
              foundEvent.coords = response.json.results[0].geometry.location;
              console.log(foundEvent.coords);
              // foundEvent.coords = {lat: 34.0522, lng: -118.2437};
              res.render("events/show.ejs", {
                user: currentUser,
                event: foundEvent,
                latNum: foundEvent.coords.lat,
                lngNum: foundEvent.coords.lng,
                sessionId: req.session.usersDbId,
                isAttending,
                session: req.session
              });
            }
          }
        );
      } catch (err) {
        res.send(err);
      }
    else {
      res.redirect("/auth/login");
    }
  },
  edit: async (req, res) => {
    if (req.session.logged === true)
      try {
        const editEvent = await Event.findById(req.params.id)
          .populate("owner")
          .exec();
        if (
          editEvent.owner._id.toString() === req.session.usersDbId.toString()
        ) {
          res.render("events/edit.ejs", {
            event: editEvent,
            id: req.params.id,
            user: req.session.usersDbId
          });
        } else {
          res.redirect(`/events/${req.params.id}`);
        }
        // console.log(editEvent);
      } catch (err) {
        res.send(err);
      }
    else {
      res.redirect("/auth/login");
    }
  },
  update: async (req, res) => {
    try {
      const updateEvent = await Event.findByIdAndUpdate(
        req.params.id,
        req.body
      );
      console.log(updateEvent);
      res.redirect("/events");
    } catch (err) {
      res.send(err);
    }
  },
  destroy: async (req, res) => {
    try {
      const destroyedEvent = await Event.findByIdAndDelete(req.params.id);
      console.log(destroyedEvent);
      res.redirect("/events");
    } catch (err) {
      res.send(err);
    }
  }
};
