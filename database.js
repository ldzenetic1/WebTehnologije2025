const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('wt26', 'root', 'password', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false
});

/* ================== MODELI ================== */

const Scenario = sequelize.define('Scenario', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: DataTypes.STRING
}, { timestamps: false });

const Line = sequelize.define('Line', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  lineId: { type: DataTypes.INTEGER, allowNull: false },
  text: DataTypes.TEXT,
  nextLineId: DataTypes.INTEGER,
  scenarioId: { type: DataTypes.INTEGER, allowNull: false }
}, {
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['scenarioId', 'lineId'] // lineId jedinstven unutar scenarija
    }
  ]
});

const Delta = sequelize.define('Delta', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  scenarioId: { type: DataTypes.INTEGER, allowNull: false },
  type: DataTypes.STRING,
  lineId: DataTypes.INTEGER,
  nextLineId: DataTypes.INTEGER,
  content: DataTypes.TEXT,
  oldName: DataTypes.STRING,
  newName: DataTypes.STRING,
  timestamp: DataTypes.INTEGER
}, { timestamps: false });

const Checkpoint = sequelize.define('Checkpoint', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  scenarioId: { type: DataTypes.INTEGER, allowNull: false },
  timestamp: DataTypes.INTEGER
}, { timestamps: false });

/* ================== RELACIJE ================== */

Scenario.hasMany(Line, {
  foreignKey: 'scenarioId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
Line.belongsTo(Scenario, {
  foreignKey: 'scenarioId'
});

Scenario.hasMany(Delta, {
  foreignKey: 'scenarioId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
Delta.belongsTo(Scenario, {
  foreignKey: 'scenarioId'
});

Scenario.hasMany(Checkpoint, {
  foreignKey: 'scenarioId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
Checkpoint.belongsTo(Scenario, {
  foreignKey: 'scenarioId'
});


module.exports = { sequelize, Scenario, Line, Delta, Checkpoint };
