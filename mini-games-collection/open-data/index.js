var data = require('./data');
var getFriendScores = data.getFriendScores;

var sharedCanvas = null;
var ctx = null;

function init() {
  sharedCanvas = wx.getSharedCanvas();
  ctx = sharedCanvas.getContext('2d');
}

wx.onMessage(function (msg) {
  if (!ctx) init();

  if (msg.type === 'showRank') {
    var gameKey = msg.gameKey || 'score_default';
    var W = sharedCanvas.width;
    var H = sharedCanvas.height;

    getFriendScores(gameKey, function (friends) {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#0a0b14';
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = '#818cf8';
      ctx.font = 'bold 18px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('好友排行榜', W / 2, 30);

      var ROW_H = 56;
      var START_Y = 50;
      var medals = ['🥇', '🥈', '🥉'];

      friends.slice(0, 20).forEach(function (f, i) {
        var y = START_Y + i * ROW_H;

        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fillRect(8, y, W - 16, ROW_H - 4);

        ctx.fillStyle = '#e0e0ff';
        ctx.font = '16px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(i < 3 ? medals[i] : String(i + 1), 30, y + 32);

        ctx.textAlign = 'left';
        ctx.fillStyle = '#e0e0ff';
        ctx.font = '14px system-ui';
        ctx.fillText(f.nickname || '玩家', 56, y + 28);

        ctx.textAlign = 'right';
        ctx.fillStyle = i === 0 ? '#fbbf24' : '#9ca3af';
        ctx.font = 'bold 16px system-ui';
        ctx.fillText(String(f.score), W - 16, y + 30);
      });

      if (friends.length === 0) {
        ctx.fillStyle = '#6b7280';
        ctx.font = '14px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('暂无好友数据', W / 2, START_Y + 40);
        ctx.fillText('邀请好友一起玩吧！', W / 2, START_Y + 65);
      }
    });
  }
});
