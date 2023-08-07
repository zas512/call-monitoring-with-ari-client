import Client from "ari-client";
const log = console.log;

// Global variables
let userInput = false;
let userInputWaiting = true;

const connection = async () => {
  try {
    // Connect to asterisk
    const ari = await Client.connect(
      "http://localhost:9088",
      "asterisk",
      "asterisk"
    );

    // Event listeners
    ari.on("StasisStart", StasisStart);
    ari.on("StasisEnd", HangUpCall);

    // Start ARI
    ari.start("ivr-by-zain");
    log("Connection Successful");
  } catch (e) {
    log("Connection error:", e);
  }
};

// Statis start function
const StasisStart = async (event, channel) => {
  try {
    log("Call received. Channel ID:", channel.id);

    // Answer call
    try {
      await channel.answer();
    } catch (error) {
      log("Error answering the call:", error.message);
    }
    log("Main menu prompt played");

    // Prompt for the main menu
    await channel.play({
      media: "sound:/var/lib/asterisk/sounds/ari-main-menu",
    });

    //Check userinput
    CheckUserInput(channel);

    // Main-menu DTMF Handler
    DtmfInput(channel, async (digit) => {
      log("DTMF received, User pressed:", digit);
      log("Channel ID:", channel.id);
      userInput = false;
      switch (digit) {
        case 1:
          await Submenu(channel, "eng");
          break;
        case 2:
          await Submenu(channel, "urdu");
          break;
        default:
          await InvalidOption(channel);
          break;
      }
    });
  } catch (e) {
    log("Error handling stasis event:", e);
  }
};

// Sub-menu Function
const Submenu = async (channel, mainMenuOption) => {
  try {
    if (!mainMenuOption) {
      await InvalidOption(channel);
      return;
    }

    // Play prompt for the submenu
    await channel.play({
      media: `sound:/var/lib/asterisk/sounds/ari-${mainMenuOption}`,
    });

    // Check user input
    CheckUserInput(channel);

    // Handle user inputs
    DtmfInput(channel, async (digit) => {
      userInput = false;
      log("DTMF received in submenu, User pressed:", digit);
      log("Channel ID:", channel.id);
      if (digit >= 1 && digit <= 6) {
        await channel.play({
          media: `sound:/var/lib/asterisk/sounds/ari-${mainMenuOption}-${digit}`,
        });
      } else if (digit === 0) {
        // Go back to the main menu
        await StasisStart(null, channel);
      } else {
        await InvalidOption(channel);
      }
    });
  } catch (e) {
    log("Error handling sub-menu:", e);
  }
};

// Invalid option handler
const InvalidOption = async (channel) => {
  await channel.play({
    media: "sound:/var/lib/asterisk/sounds/you-dialed-wrong-number",
  });
  await StasisStart(null, channel);
};

// HangUp call
const HangUpCall = async (event, channel) => {
  try {
    log("Call hangup requested, Channel id:", channel.id);
    if (channel.state !== "destroyed") {
      await channel.hangup();
      log("Call hung up, channel id:", channel.id);
    }
    log("Call hung up");
  } catch (e) {
    log("Error hanging up call:", e.message);
  }
};

// DTMF input function
const DtmfInput = async (channel, callback) => {
  const DtmfReceived = async (event) => {
    userInput = true;
    userInputWaiting = false;
    const digit = parseInt(event.digit);
    channel.removeListener("ChannelDtmfReceived", DtmfReceived);
    await callback(digit);
    userInputWaiting = true;
  };
  channel.on("ChannelDtmfReceived", DtmfReceived);
};

// Wait for user input
const CheckUserInput = (channel) => {
  setTimeout(() => {
    if (userInput == false) {
      log("Waiting for user input");
      userInput = true;
      let count = 0;
      const intervalId = setInterval(() => {
        count++;
        console.log("Attempt:", count);
        if (userInputWaiting) {
          playSound(channel);
        }
        if (count === 3) {
          clearInterval(intervalId);
          if (userInputWaiting) {
            HangUpCall(channel);
          }
        }
      }, 5000);
    }
  }, 5000);
};
const playSound = async (channel) => {
  try {
    log("Playing try again sound");
    await channel.play({
      media: "sound:/var/lib/asterisk/sounds/pls-try-again",
    });
  } catch (e) {}
};

connection();
