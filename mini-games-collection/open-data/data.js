function getFriendScores(gameKey, callback) {
  wx.getFriendCloudStorage({
    keyList: [gameKey],
    success: function (res) {
      var friends = (res.data || [])
        .map(function (f) {
          var kv = f.KVDataList.find(function (k) { return k.key === gameKey; });
          if (!kv) return null;
          var data = JSON.parse(kv.value);
          return {
            nickname: f.nickname,
            avatarUrl: f.avatarUrl,
            score: data.score || 0,
            time: data.time || 0
          };
        })
        .filter(Boolean)
        .sort(function (a, b) { return b.score - a.score; });
      callback(friends);
    },
    fail: function () {
      callback([]);
    }
  });
}

module.exports = { getFriendScores };
