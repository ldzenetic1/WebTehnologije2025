const PoziviAjax = (function() {
  const BASE_URL = 'http://localhost:3000/api';

  function makeRequest(method, url, data, callback) {
    const xhr = new XMLHttpRequest();
    
    xhr.open(method, url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        let responseData = null;
        try {
          responseData = JSON.parse(xhr.responseText);
        } catch (e) {
          responseData = { message: 'Greška pri parsiranju odgovora' };
        }
        callback(xhr.status, responseData);
      }
    };
    
    xhr.onerror = function() {
      callback(0, { message: 'Greška u mreži' });
    };
    
    if (data) {
      xhr.send(JSON.stringify(data));
    } else {
      xhr.send();
    }
  }

  return {
    postScenario: function(title, callback) {
      const url = `${BASE_URL}/scenarios`;
      const data = { title: title };
      makeRequest('POST', url, data, callback);
    },

    lockLine: function(scenarioId, lineId, userId, callback) {
      const url = `${BASE_URL}/scenarios/${scenarioId}/lines/${lineId}/lock`;
      const data = { userId: userId };
      makeRequest('POST', url, data, callback);
    },

    updateLine: function(scenarioId, lineId, userId, newText, callback) {
      const url = `${BASE_URL}/scenarios/${scenarioId}/lines/${lineId}`;
      const data = { userId: userId, newText: newText };
      makeRequest('PUT', url, data, callback);
    },

    lockCharacter: function(scenarioId, characterName, userId, callback) {
      const url = `${BASE_URL}/scenarios/${scenarioId}/characters/lock`;
      const data = { userId: userId, characterName: characterName };
      makeRequest('POST', url, data, callback);
    },

    updateCharacter: function(scenarioId, userId, oldName, newName, callback) {
      const url = `${BASE_URL}/scenarios/${scenarioId}/characters/update`;
      const data = { userId: userId, oldName: oldName, newName: newName };
      makeRequest('POST', url, data, callback);
    },

    getDeltas: function(scenarioId, since, callback) {
      const url = `${BASE_URL}/scenarios/${scenarioId}/deltas?since=${since}`;
      makeRequest('GET', url, null, callback);
    },

    getScenario: function(scenarioId, callback) {
      const url = `${BASE_URL}/scenarios/${scenarioId}`;
      makeRequest('GET', url, null, callback);
    }
  };
})();