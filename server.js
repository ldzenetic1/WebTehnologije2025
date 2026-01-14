const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

const DATA_DIR = path.join(__dirname, 'data');
const SCENARIOS_DIR = path.join(DATA_DIR, 'scenarios');
const DELTAS_FILE = path.join(DATA_DIR, 'deltas.json');

const lineLocks = {}; 
const characterLocks = {}; 
const userLocks = {}; 

function initializeStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SCENARIOS_DIR)) {
    fs.mkdirSync(SCENARIOS_DIR, { recursive: true });
  }
  if (!fs.existsSync(DELTAS_FILE)) {
    fs.writeFileSync(DELTAS_FILE, JSON.stringify([], null, 2));
  }
}

initializeStorage();

function getScenarioPath(scenarioId) {
  return path.join(SCENARIOS_DIR, `scenario-${scenarioId}.json`);
}

function readScenario(scenarioId) {
  const filePath = getScenarioPath(scenarioId);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const data = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(data);
}

function writeScenario(scenario) {
  const filePath = getScenarioPath(scenario.id);
  fs.writeFileSync(filePath, JSON.stringify(scenario, null, 2));
}

function readDeltas() {
  const data = fs.readFileSync(DELTAS_FILE, 'utf8');
  return JSON.parse(data);
}

function writeDeltas(deltas) {
  fs.writeFileSync(DELTAS_FILE, JSON.stringify(deltas, null, 2));
}

function getNextScenarioId() {
  const files = fs.readdirSync(SCENARIOS_DIR);
  let maxId = 0;
  files.forEach(file => {
    const match = file.match(/scenario-(\d+)\.json/);
    if (match) {
      const id = parseInt(match[1]);
      if (id > maxId) maxId = id;
    }
  });
  return maxId + 1;
}

function getNextLineId(scenario) {
  let maxId = 0;
  scenario.content.forEach(line => {
    if (line.lineId > maxId) maxId = line.lineId;
  });
  return maxId + 1;
}

function countWords(text) {
  if (!text || text.trim() === '') return 0;
  return text.trim().split(/\s+/).length;
}

function splitTextIntoLines(text) {
  const words = text.trim().split(/\s+/);
  const lines = [];
  
  for (let i = 0; i < words.length; i += 20) {
    const lineWords = words.slice(i, i + 20);
    lines.push(lineWords.join(' '));
  }
  
  return lines;
}

function unlockUserLine(userId) {
  if (userLocks[userId]) {
    const { scenarioId, lineId } = userLocks[userId];
    const lockKey = `${scenarioId}-${lineId}`;
    delete lineLocks[lockKey];
    delete userLocks[userId];
  }
}

app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/scenarios', (req, res) => {
  const { title } = req.body;
  const scenarioTitle = (title && title.trim() !== '') ? title : 'Neimenovani scenarij';
  
  const newScenario = {
    id: getNextScenarioId(),
    title: scenarioTitle,
    content: [
      {
        lineId: 1,
        nextLineId: null,
        text: ''
      }
    ]
  };
  
  writeScenario(newScenario);
  
  res.status(200).json(newScenario);
});

app.post('/api/scenarios/:scenarioId/lines/:lineId/lock', (req, res) => {
  const scenarioId = parseInt(req.params.scenarioId);
  const lineId = parseInt(req.params.lineId);
  const { userId } = req.body;
  
  const scenario = readScenario(scenarioId);
  if (!scenario) {
    return res.status(404).json({ message: 'Scenario ne postoji!' });
  }
  
  const lineExists = scenario.content.some(line => line.lineId === lineId);
  if (!lineExists) {
    return res.status(404).json({ message: 'Linija ne postoji!' });
  }
  
  const lockKey = `${scenarioId}-${lineId}`;
  
  if (lineLocks[lockKey] && lineLocks[lockKey] !== userId) {
    return res.status(409).json({ message: 'Linija je vec zakljucana!' });
  }
  
  unlockUserLine(userId);
  
  lineLocks[lockKey] = userId;
  userLocks[userId] = { scenarioId, lineId };
  
  res.status(200).json({ message: 'Linija je uspjesno zakljucana!' });
});

app.put('/api/scenarios/:scenarioId/lines/:lineId', (req, res) => {
  const scenarioId = parseInt(req.params.scenarioId);
  const lineId = parseInt(req.params.lineId);
  const { userId, newText } = req.body;
  
  if (!Array.isArray(newText) || newText.length === 0) {
    return res.status(400).json({ message: 'Niz new_text ne smije biti prazan!' });
  }
  
  const scenario = readScenario(scenarioId);
  if (!scenario) {
    return res.status(404).json({ message: 'Scenario ne postoji!' });
  }
  
  const lineIndex = scenario.content.findIndex(line => line.lineId === lineId);
  if (lineIndex === -1) {
    return res.status(404).json({ message: 'Linija ne postoji!' });
  }
  
  const lockKey = `${scenarioId}-${lineId}`;
  
  if (!lineLocks[lockKey]) {
    return res.status(409).json({ message: 'Linija nije zakljucana!' });
  }
  
  if (lineLocks[lockKey] !== userId) {
    return res.status(409).json({ message: 'Linija je vec zakljucana!' });
  }
  
  const allLines = [];
  newText.forEach(text => {
    const wordCount = countWords(text);
    if (wordCount <= 20) {
      allLines.push(text);
    } else {
      const splitLines = splitTextIntoLines(text);
      allLines.push(...splitLines);
    }
  });
  
  const originalNextLineId = scenario.content[lineIndex].nextLineId;
  const timestamp = Math.floor(Date.now() / 1000);
  
  scenario.content[lineIndex].text = allLines[0];
  
  let currentNextLineId = originalNextLineId;
  const newLinesData = [];
  
  for (let i = 1; i < allLines.length; i++) {
    const newLineId = getNextLineId(scenario);
    newLinesData.push({
      lineId: newLineId,
      nextLineId: currentNextLineId,
      text: allLines[i]
    });
    currentNextLineId = newLineId;
  }
  
  scenario.content[lineIndex].nextLineId = currentNextLineId;
  
  newLinesData.reverse().forEach(newLine => {
    scenario.content.splice(lineIndex + 1, 0, newLine);
  });
  
  writeScenario(scenario);
  
  const deltas = readDeltas();
  
  deltas.push({
    scenarioId: scenarioId,
    type: 'line_update',
    lineId: lineId,
    nextLineId: scenario.content[lineIndex].nextLineId,
    content: allLines[0],
    timestamp: timestamp
  });

  newLinesData.reverse().forEach(newLine => {
    deltas.push({
      scenarioId: scenarioId,
      type: 'line_update',
      lineId: newLine.lineId,
      nextLineId: newLine.nextLineId,
      content: newLine.text,
      timestamp: timestamp
    });
  });
  
  writeDeltas(deltas);
  
  delete lineLocks[lockKey];
  delete userLocks[userId];
  
  res.status(200).json({ message: 'Linija je uspjesno azurirana!' });
});

app.post('/api/scenarios/:scenarioId/characters/lock', (req, res) => {
  const scenarioId = parseInt(req.params.scenarioId);
  const { userId, characterName } = req.body;
  
  const scenario = readScenario(scenarioId);
  if (!scenario) {
    return res.status(404).json({ message: 'Scenario ne postoji!' });
  }
  
  const lockKey = `${scenarioId}-${characterName}`;
  
  if (characterLocks[lockKey]) {
    return res.status(409).json({ message: 'Konflikt! Ime lika je vec zakljucano!' });
  }
  
  characterLocks[lockKey] = userId;
  
  res.status(200).json({ message: 'Ime lika je uspjesno zakljucano!' });
});

app.post('/api/scenarios/:scenarioId/characters/update', (req, res) => {
  const scenarioId = parseInt(req.params.scenarioId);
  const { userId, oldName, newName } = req.body;
  
  const scenario = readScenario(scenarioId);
  if (!scenario) {
    return res.status(404).json({ message: 'Scenario ne postoji!' });
  }
  
  scenario.content.forEach(line => {
    if (line.text) {
      line.text = line.text.split(oldName).join(newName);
    }
  });
  
  writeScenario(scenario);
  
  const deltas = readDeltas();
  const timestamp = Math.floor(Date.now() / 1000);
  deltas.push({
    scenarioId: scenarioId,
    type: 'char_rename',
    oldName: oldName,
    newName: newName,
    timestamp: timestamp
  });
  writeDeltas(deltas);
  
  const lockKey = `${scenarioId}-${oldName}`;
  delete characterLocks[lockKey];
  
  res.status(200).json({ message: 'Ime lika je uspjesno promijenjeno!' });
});

app.get('/api/scenarios/:scenarioId/deltas', (req, res) => {
  const scenarioId = parseInt(req.params.scenarioId);
  const since = parseInt(req.query.since) || 0;
  
  const scenario = readScenario(scenarioId);
  if (!scenario) {
    return res.status(404).json({ message: 'Scenario ne postoji!' });
  }
  
  const allDeltas = readDeltas();
  const filteredDeltas = allDeltas
    .filter(delta => delta.scenarioId === scenarioId && delta.timestamp > since)
    .sort((a, b) => a.timestamp - b.timestamp);
  
  res.status(200).json({ deltas: filteredDeltas });
});

app.get('/api/scenarios/:scenarioId', (req, res) => {
  const scenarioId = parseInt(req.params.scenarioId);
  
  const scenario = readScenario(scenarioId);
  if (!scenario) {
    return res.status(404).json({ message: 'Scenario ne postoji!' });
  }
  
  res.status(200).json(scenario);
});

app.listen(PORT, () => {
  console.log(`Server pokrenut na portu ${PORT}`);
});