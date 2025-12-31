const PoziviAjaxFetch = (function() {
  const BASE_URL = 'http://localhost:3000/api';

  function makeRequest(method, url, data, callback) {
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    fetch(url, options)
      .then(response => {
        return response.json().then(data => {
          return { status: response.status, data: data };
        });
      })
      .then(result => {
        callback(result.status, result.data);
      })
      .catch(error => {
        callback(0, { message: 'Greška u mreži: ' + error.message });
      });
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