const express = require('express');
const cors = require('cors');
const { sequelize, Scenario, Line, Delta, Checkpoint } = require('./database');
const { Op } = require('sequelize');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

const lineLocks = {};      
const userLocks = {};      
const characterLocks = {}; 

function unlockPreviousLine(userId) {
  const key = userLocks[userId];
  if (key) {
    delete lineLocks[key];
    delete userLocks[userId];
  }
}

function sortLinesByNextId(lines) {
  if (lines.length === 0) return [];
  
  const nextLineIds = new Set(lines.map(l => l.nextLineId).filter(id => id !== null));
  const firstLine = lines.find(l => !nextLineIds.has(l.lineId));
  
  if (!firstLine) return lines;
  
  const lineMap = {};
  lines.forEach(line => {
    lineMap[line.lineId] = line;
  });
  
  const sorted = [];
  let current = firstLine;
  const visited = new Set();
  
  while (current && !visited.has(current.lineId)) {
    visited.add(current.lineId);
    sorted.push(current);
    if (current.nextLineId === null) break;
    current = lineMap[current.nextLineId];
  }
  
  return sorted;
}

app.post('/api/scenarios', async (req, res) => {
  const scenario = await Scenario.create({ 
    title: req.body.title || 'Neimenovani scenarij' 
  });
  const line = await Line.create({ 
    scenarioId: scenario.id, 
    lineId: 1, 
    text: '', 
    nextLineId: null 
  });
  res.status(200).json({
    id: scenario.id,
    title: scenario.title,
    content: [{
      lineId: line.lineId,
      nextLineId: line.nextLineId,
      text: line.text
    }]
  });
});

app.post('/api/scenarios/:scenarioId/lines/:lineId/lock', async (req, res) => {
  const { scenarioId, lineId } = req.params;
  const { userId } = req.body;

  const scenario = await Scenario.findByPk(scenarioId);
  if (!scenario) return res.status(404).json({ message: 'Scenario ne postoji!' });

  const line = await Line.findOne({ where: { scenarioId, lineId } });
  if (!line) return res.status(404).json({ message: 'Linija ne postoji!' });

  const key = `${scenarioId}-${lineId}`;
  
  if (lineLocks[key] && lineLocks[key] !== userId) {
    return res.status(409).json({ message: 'Linija je vec zakljucana!' });
  }

  unlockPreviousLine(userId);

  lineLocks[key] = userId;
  userLocks[userId] = key;

  res.status(200).json({ message: 'Linija je uspjesno zakljucana!' });
});


app.put('/api/scenarios/:scenarioId/lines/:lineId', async (req, res) => {
  try {
    const scenarioId = parseInt(req.params.scenarioId);
    const lineId = parseInt(req.params.lineId);
    const { userId, newText } = req.body;

    if (!Array.isArray(newText) || newText.length === 0) {
      return res.status(400).json({
        message: "Niz new_text ne smije biti prazan!"
      });
    }
    const scenario = await Scenario.findByPk(scenarioId);
    if (!scenario) {
      return res.status(404).json({
        message: "Scenario ne postoji!"
      });
    }
    const line = await Line.findOne({
      where: { scenarioId, lineId }
    });

    if (!line) {
      return res.status(404).json({
        message: "Linija ne postoji!"
      });
    }

    const lock = locks.find(
      l => l.scenarioId === scenarioId && l.lineId === lineId
    );

    if (!lock) {
      return res.status(409).json({
        message: "Linija nije zakljucana!"
      });
    }

    if (lock.userId !== userId) {
      return res.status(409).json({
        message: "Linija je vec zakljucana!"
      });
    }

    const oldNextLineId = line.nextLineId;

    
    let wrappedLines = [];
    newText.forEach(text => {
      wrappedLines.push(...wrapText(text));
    });

    line.text = wrappedLines[0];
    await line.save();

    const maxLine = await Line.findOne({
      where: { scenarioId },
      order: [['lineId', 'DESC']]
    });

    let maxLineId = maxLine ? maxLine.lineId : 0;
    let previousLineId = lineId;
    let previousNextLineId = oldNextLineId;

    for (let i = 1; i < wrappedLines.length; i++) {
      maxLineId++;

      const newLine = await Line.create({
        scenarioId,
        lineId: maxLineId,
        text: wrappedLines[i],
        nextLineId: null
      });

      await Line.update(
        { nextLineId: newLine.lineId },
        { where: { scenarioId, lineId: previousLineId } }
      );

      previousLineId = newLine.lineId;
    }

    await Line.update(
      { nextLineId: oldNextLineId },
      { where: { scenarioId, lineId: previousLineId } }
    );

    await Delta.create({
      scenarioId,
      type: "line_update",
      lineId,
      nextLineId: oldNextLineId,
      content: wrappedLines.join(" "),
      timestamp: Math.floor(Date.now() / 1000)
    });

    locks = locks.filter(
      l => !(l.scenarioId === scenarioId && l.lineId === lineId)
    );

    res.status(200).json({
      message: "Linija je uspjesno azurirana!"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Greška pri ažuriranju linije!" });
  }
});

app.post('/api/scenarios/:scenarioId/characters/lock', async (req, res) => {
  const { scenarioId } = req.params;
  const { userId, characterName } = req.body;

  const scenario = await Scenario.findByPk(scenarioId);
  if (!scenario) return res.status(404).json({ message: 'Scenario ne postoji!' });

  const key = `${scenarioId}-${characterName}`;
  if (characterLocks[key]) {
    return res.status(409).json({ message: 'Konflikt! Ime lika je vec zakljucano!' });
  }

  characterLocks[key] = userId;
  res.status(200).json({ message: 'Ime lika je uspjesno zakljucano!' });
});

app.post('/api/scenarios/:scenarioId/characters/update', async (req, res) => {
  const { scenarioId } = req.params;
  const { userId, oldName, newName } = req.body;

  const scenario = await Scenario.findByPk(scenarioId);
  if (!scenario) return res.status(404).json({ message: 'Scenario ne postoji!' });

  const key = `${scenarioId}-${oldName}`;
  
  if (!characterLocks[key]) {
    return res.status(409).json({ message: 'Ime lika nije zakljucano!' });
  }
  
  if (characterLocks[key] !== userId) {
    return res.status(409).json({ message: 'Nemate pravo da promijenite ovo ime!' });
  }

  const lines = await Line.findAll({ where: { scenarioId } });
  for (const l of lines) {
    if (l.text && l.text.includes(oldName)) {
      await l.update({ text: l.text.split(oldName).join(newName) });
    }
  }

  const timestamp = Math.floor(Date.now() / 1000);
  
  await Delta.create({
    scenarioId,
    type: 'char_rename',
    oldName,
    newName,
    timestamp
  });

  delete characterLocks[key];

  res.status(200).json({ message: 'Ime lika je uspjesno promijenjeno!' });
});

app.get('/api/scenarios/:scenarioId/deltas', async (req, res) => {
  const { scenarioId } = req.params;
  const since = parseInt(req.query.since || 0);

  const scenario = await Scenario.findByPk(scenarioId);
  if (!scenario) return res.status(404).json({ message: 'Scenario ne postoji!' });

  const deltas = await Delta.findAll({
    where: { 
      scenarioId, 
      timestamp: { [Op.gt]: since } 
    },
    order: [['timestamp', 'ASC']],
    raw: true
  });

  res.status(200).json({ deltas });
});

app.get('/api/scenarios/:scenarioId', async (req, res) => {
  const { scenarioId } = req.params;
  
  const scenario = await Scenario.findByPk(scenarioId);
  if (!scenario) return res.status(404).json({ message: 'Scenario ne postoji!' });
  
  const lines = await Line.findAll({ 
    where: { scenarioId },
    raw: true 
  });
  
  const sortedLines = sortLinesByNextId(lines);
  
  res.status(200).json({
    id: scenario.id,
    title: scenario.title,
    content: sortedLines.map(l => ({
      lineId: l.lineId,
      nextLineId: l.nextLineId,
      text: l.text
    }))
  });
});

app.post('/api/scenarios/:scenarioId/checkpoint', async (req, res) => {
  const { scenarioId } = req.params;
  const { userId } = req.body;
  
  const scenario = await Scenario.findByPk(scenarioId);
  if (!scenario) return res.status(404).json({ message: 'Scenario ne postoji!' });
  
  const timestamp = Math.floor(Date.now() / 1000);
  
  await Checkpoint.create({ scenarioId, timestamp });
  
  res.status(200).json({ message: 'Checkpoint je uspjesno kreiran!' });
});

app.get('/api/scenarios/:scenarioId/checkpoints', async (req, res) => {
  const { scenarioId } = req.params;
  
  const scenario = await Scenario.findByPk(scenarioId);
  if (!scenario) return res.status(404).json({ message: 'Scenario ne postoji!' });
  
  const checkpoints = await Checkpoint.findAll({
    where: { scenarioId },
    attributes: ['id', 'timestamp'],
    order: [['timestamp', 'ASC']],
    raw: true
  });
  
  res.status(200).json(checkpoints);
});

app.get('/api/scenarios/:scenarioId/restore/:checkpointId', async (req, res) => {
  const { scenarioId, checkpointId } = req.params;
  
  const scenario = await Scenario.findByPk(scenarioId);
  if (!scenario) return res.status(404).json({ message: 'Scenario ne postoji!' });
  
  const checkpoint = await Checkpoint.findByPk(checkpointId);
  if (!checkpoint || checkpoint.scenarioId != scenarioId) {
    return res.status(404).json({ message: 'Checkpoint ne postoji!' });
  }
  
  let restoredLines = [{ lineId: 1, text: '', nextLineId: null }];
  
  const deltas = await Delta.findAll({
    where: {
      scenarioId,
      timestamp: { [Op.lte]: checkpoint.timestamp }
    },
    order: [['timestamp', 'ASC']],
    raw: true
  });
  
  for (const delta of deltas) {
    if (delta.type === 'line_update') {
      const existingLine = restoredLines.find(l => l.lineId === delta.lineId);
      if (existingLine) {
        existingLine.text = delta.content;
        existingLine.nextLineId = delta.nextLineId;
      } else {
        restoredLines.push({
          lineId: delta.lineId,
          text: delta.content,
          nextLineId: delta.nextLineId
        });
      }
    } else if (delta.type === 'char_rename') {
      restoredLines.forEach(line => {
        if (line.text && line.text.includes(delta.oldName)) {
          line.text = line.text.split(delta.oldName).join(delta.newName);
        }
      });
    }
  }
  
  const sortedLines = sortLinesByNextId(restoredLines);
  
  res.status(200).json({
    id: scenario.id,
    title: scenario.title,
    content: sortedLines
  });
});

app.listen(PORT, async () => {
  console.log('Resetovanje baze...');
  await sequelize.sync({ force: true });

  console.log('Kreiranje test scenarija...');

  await Scenario.create({
    id: 1,
    title: 'Potraga za izgubljenim ključem'
  });

  await Line.bulkCreate([
    {
      scenarioId: 1,
      lineId: 1,
      nextLineId: 2,
      text: 'NARATOR: Sunce je polako zalazilo nad starim gradom.'
    },
    {
      scenarioId: 1,
      lineId: 2,
      nextLineId: 3,
      text: 'ALICE: Jesi li siguran da je ključ ostao u biblioteci?'
    },
    {
      scenarioId: 1,
      lineId: 3,
      nextLineId: 4,
      text: 'BOB: To je posljednje mjesto gdje sam ga vidio prije nego što je pala noć.'
    },
    {
      scenarioId: 1,
      lineId: 4,
      nextLineId: 5,
      text: 'ALICE: Moramo požuriti prije nego što čuvar zaključa glavna vrata.'
    },
    {
      scenarioId: 1,
      lineId: 5,
      nextLineId: 6,
      text: 'BOB: Čekaj, čuješ li taj zvuk iza polica?'
    },
    {
      scenarioId: 1,
      lineId: 6,
      nextLineId: null,
      text: 'NARATOR: Iz sjene se polako pojavila nepoznata figura.'
    }
  ]);

  console.log('Test scenario ubačen');
  console.log(`Server spreman na http://localhost:${PORT}`);
});
