const fetch = require('node-fetch');

const authCheck = function (req, res, next) {
  try {
    const token = req.headers.authorization.split(' ')[1];

    fetch('https://emssd.b2e.cht.com.tw:7703/auth/realms/apiman/protocol/openid-connect/token/introspect', {
      body: JSON.stringify({
        client_id: 'healthClient',
        client_secret: '22ad7c1b-742f-459c-a5ba-ae6c8a2c3bc1',
        token: token
      }),
      headers: {
        'Content-Type': 'application/json'
      },
      method: 'POST'
    })
      .then(response => {
        if (response.status === 200)
          next()
        else
          res.status(401).json({ error: 'Not authorized' });
      })
  }
  catch (err) {
    console.log(err);
    res.status(401).json({ error: 'Not authorized' });
  }
}