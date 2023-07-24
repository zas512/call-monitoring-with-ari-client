const { Sequelize, DataTypes } = require("sequelize");

const sequelize = new Sequelize("AudioMenu", "zain1", "zain1", {
  host: "localhost",
  dialect: "mysql",
  logging: false,
});

const MainPrompts = sequelize.define("main_prompts", {
  user_input: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  file_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  file_path: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

const EngPrompts = sequelize.define("eng_prompts", {
  user_input: {
    type: DataTypes.INTEGER,
    primaryKey: true,
  },
  file_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  file_path: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

const UrduPrompts = sequelize.define("urdu_prompts", {
  user_input: {
    type: DataTypes.INTEGER,
    primaryKey: true,
  },
  file_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  file_path: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

const connectToDb = async () => {
  try {
    await sequelize.authenticate();
    console.log("Connected to the database.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
};

module.exports = {
  connectToDb,
  MainPrompts,
  EngPrompts,
  UrduPrompts,
};
