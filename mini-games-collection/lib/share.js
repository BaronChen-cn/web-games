var SHARE_TEMPLATES = {
  stack:    { title: function (s) { return '我在叠叠乐叠了' + (s.layers || s.score) + '层，你能超过我吗？'; }, emoji: '📦' },
  snake:    { title: function (s) { return '我在贪吃蛇拿了' + s.score + '分，你能超过我吗？'; }, emoji: '🐍' },
  flappy:   { title: function (s) { return 'Flappy Bird ' + s.score + '分！来挑战！'; }, emoji: '🐦' },
  tetris:   { title: function (s) { return '俄罗斯方块消了' + (s.lines || s.score) + '行，敢来比吗？'; }, emoji: '🧱' },
  match3:   { title: function (s) { return '消消乐第' + s.level + '关 ' + s.score + '分，来超越我！'; }, emoji: '💎' },
  fruit:    { title: function (s) { return '切水果' + s.score + '分！你的刀法如何？'; }, emoji: '🍎' },
  breakout: { title: function (s) { return '打砖块第' + s.level + '关 ' + s.score + '分！'; }, emoji: '🧱' },
  '2048':   { title: function (s) { return '2048 最高' + s.score + '分，你能拼出2048吗？'; }, emoji: '🔢' },
  pvz:      { title: function (s) { return '植物守卫战通过了第' + s.level + '关！'; }, emoji: '🌻' }
};

function getPackage(gameId) {
  var casual = ['stack', 'snake', 'tetris', 'match3', '2048'];
  var arcade = ['flappy', 'fruit', 'breakout'];
  if (casual.indexOf(gameId) !== -1) return 'pkg-casual';
  if (arcade.indexOf(gameId) !== -1) return 'pkg-arcade';
  return 'pkg-strategy';
}

function configShare(page, gameId, getScoreData) {
  var tmpl = SHARE_TEMPLATES[gameId];
  if (!tmpl) return;

  page.onShareAppMessage = function () {
    var scoreData = getScoreData ? getScoreData() : {};
    return {
      title: tmpl.title(scoreData),
      path: '/packages/' + getPackage(gameId) + '/' + gameId + '/index?challenge=' + (scoreData.score || 0)
    };
  };

  page.onShareTimeline = function () {
    var scoreData = getScoreData ? getScoreData() : {};
    return {
      title: tmpl.title(scoreData),
      query: 'challenge=' + (scoreData.score || 0)
    };
  };
}

function handleShareLanding(options) {
  if (options && options.challenge) {
    return {
      challengeScore: parseInt(options.challenge) || 0,
      isChallenge: true
    };
  }
  return { isChallenge: false };
}

module.exports = { configShare, handleShareLanding };
