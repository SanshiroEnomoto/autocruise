const { loadConfig } = require('../autocruise.js');

describe('loadConfig', () => {
  beforeEach(() => {
    document.body.innerHTML = '<a href="fallback">fallback</a>';
  });

  afterEach(() => {
    if (global.fetch && typeof global.fetch.mockClear === 'function') {
      global.fetch.mockClear();
    }
    delete global.fetch;
    document.body.innerHTML = '';
    window.history.replaceState({}, '', '/');
  });

  const runLoadConfig = () =>
    new Promise(resolve => {
      loadConfig(resolve);
    });

  test('parses nested query parameters for config, interval, and view', async () => {
    const remoteConfig = 'https://cdn.example.com/config.json?inner=1%26two=2';
    window.history.replaceState({}, '', `/?config=${remoteConfig}&interval=120&view=tile`);

    const mockResponse = {
      ok: true,
      json: async () => ({
        interval: 45,
        view: 'cycle',
        pages: ['https://remote/page'],
      }),
    };
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    const config = await runLoadConfig();

    expect(global.fetch).toHaveBeenCalledWith('https://cdn.example.com/config.json?inner=1&two=2');
    expect(config.interval).toBe(120);
    expect(config.view).toBe('tile');
    expect(config.pages).toEqual(['https://remote/page']);
  });

  test('writes escaped error message when fetch fails', async () => {
    window.history.replaceState({}, '', '/?config=<script>alert("xss")</script>');
    global.fetch = jest.fn().mockRejectedValue(new Error('<boom> & fail'));

    await runLoadConfig();

    expect(document.body.innerHTML).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(document.body.innerHTML).not.toContain('<script>');
    expect(document.body.innerHTML).toContain('&lt;boom&gt; &amp; fail');
  });
});
