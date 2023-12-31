const client = require("ari-client");
const {
  connectToDb,
  MainPrompts,
  EngPrompts,
  UrduPrompts,
} = require("./db_connection/db.js");
const log = console.log;

// Global variables
let userInput = false;
let userInputWaiting = true;

const connection = async () => {
  try {
    // Connect to asterisk
    const ari = await client.connect(
      "http://localhost:9088",
      "asterisk",
      "asterisk"
    );

    // Event listeners
    ari.on("StasisStart", StasisStart);
    ari.on("StasisEnd", HangUpCall);

    // Start ARI
    ari.start("ivr-by-zain");
    log("Connected to asterisk.");
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

    // Retrieve and play the main menu prompt from the database
    const mainPrompt = await MainPrompts.findOne({
      where: {
        file_name: "main-menu",
      },
    });
    log(mainPrompt);
    if (mainPrompt) {
      await channel.play({
        media: `sound:${mainPrompt.file_path}`,
      });
    } else {
      // If main menu prompt is not found, play a default prompt
      log(
        "Main menu prompt not found in the database. Playing default prompt."
      );
      await channel.play({
        media: "sound:/var/lib/asterisk/sounds/default-main-menu-prompt",
      });
    }

    //Check user input
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

    /* await channel.play({
      media: `sound:/var/lib/asterisk/sounds/ari-${mainMenuOption}`,
    }); */

    const langPrompt = await MainPrompts.findOne({
      where: {
        file_name: `ari-${mainMenuOption}`,
      },
    });

    // Play prompt for the submenu
    if (langPrompt) {
      await channel.play({
        media: `sound:${langPrompt.file_path}`,
      });
    } else {
      await InvalidOption(channel);
      return;
    }

    // Check user input
    CheckUserInput(channel);

    // Handle user inputs
    DtmfInput(channel, async (digit) => {
      userInput = false;
      log("DTMF received in submenu, User pressed:", digit);
      log("Channel ID:", channel.id);
      if (digit >= 1 && digit <= 6) {
        const submenuDigitPrompt = await (mainMenuOption === "eng"
          ? EngPrompts
          : UrduPrompts
        ).findOne({
          where: {
            file_name: `ari-${mainMenuOption}-${digit}`,
          },
        });
        if (submenuDigitPrompt) {
          await channel.play({
            media: `sound:${submenuDigitPrompt.file_path}`,
          });
        } else {
          await InvalidOption(channel);
        }
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
  try {
    const invalidPrompt = await MainPrompts.findOne({
      where: {
        file_name: "wrong",
      },
    });
    if (invalidPrompt) {
      await channel.play({
        media: `sound:${invalidPrompt.file_path}`,
      });
    } else {
      log(
        "Invalid option prompt not found in the database. Playing default prompt."
      );
      await channel.play({
        media: "sound:/var/lib/asterisk/sounds/you-dialed-wrong-number",
      });
    }
  } catch (error) {
    log("Error playing invalid option prompt:", error.message);
  }

  // Go back to the main menu
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
    const tryAgainPrompt = await MainPrompts.findOne({
      where: {
        file_name: "try_again",
      },
    });
    if (tryAgainPrompt) {
      await channel.play({
        media: `sound:${tryAgainPrompt.file_path}`,
      });
    } else {
      log(
        "Try again prompt not found in the database. Playing default prompt."
      );
      await channel.play({
        media: "sound:/var/lib/asterisk/sounds/pls-try-again",
      });
    }
  } catch (error) {
    log("Error playing try again prompt:", error.message);
  }
};

async function main() {
  try {
    await connectToDb();
    connection();
  } catch (error) {
    console.error("Error in the main function:", error);
  }
}

main();
