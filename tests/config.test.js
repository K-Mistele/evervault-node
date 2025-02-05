const chai = require('chai');
chai.use(require('sinon-chai'));
const { expect } = chai;
const sinon = require('sinon');

const rewire = require('rewire');
const { errors } = require('../lib/utils');

const testApiKey =
  'ev:key:1:3bOqOkKrVFrk2Ps9yM1tHEi90CvZCjsGIihoyZncM9SdLoXQxknPPjwxiMLyDVYyX:cRhR9o:tCZFZV';
const testAppId = 'app_8022cc5a3073';

let EvervaultClient;
const encryptStub = sinon.stub();
describe('Testing the Evervault SDK Config', () => {
  beforeEach(() => {
    EvervaultClient = rewire('../lib');
    EvervaultClient.__set__({
      Crypto: () => ({
        encrypt: encryptStub,
      }),
    });
  });

  afterEach(() => {
    encryptStub.reset();
    process.env.EV_API_URL = undefined;
    process.env.EV_CAGE_RUN_URL = undefined;
    process.env.EV_TUNNEL_HOSTNAME = undefined;
    process.env.EV_CERT_HOSTNAME = undefined;
  });

  context('Initialising the sdk', () => {
    const prepareSdkImport =
      (...args) =>
      () => {
        return new EvervaultClient(...args);
      };

    context('No endpoint overrides exists', () => {
      it('uses the default endpoints', () => {
        const sdk = new EvervaultClient(testAppId, testApiKey);
        expect(sdk.config.http.baseUrl).to.equal('https://api.evervault.com');
        expect(sdk.config.http.functionRunUrl).to.equal(
          'https://run.evervault.com'
        );
        expect(sdk.config.http.tunnelHostname).to.equal(
          'https://relay.evervault.com:443'
        );
        expect(sdk.config.http.certHostname).to.equal(
          'https://ca.evervault.com'
        );
      });
    });

    context('Endpoint overrides exist', () => {
      it('uses custom endpoints', () => {
        const relay_url = 'https://custom.url.com';
        const run_url = 'https://custom.run.url.com';
        const tunnel_hostname = 'https://custom.tunnel.url.com';
        const ca_hostname = 'https://ca.custom.url.com';

        process.env.EV_API_URL = relay_url;
        process.env.EV_CAGE_RUN_URL = run_url;
        process.env.EV_TUNNEL_HOSTNAME = tunnel_hostname;
        process.env.EV_CERT_HOSTNAME = ca_hostname;

        const sdk = new EvervaultClient(testAppId, testApiKey);
        expect(sdk.config.http.baseUrl).to.equal(relay_url);
        expect(sdk.config.http.functionRunUrl).to.equal(run_url);
        expect(sdk.config.http.tunnelHostname).to.equal(tunnel_hostname);
        expect(sdk.config.http.certHostname).to.equal(ca_hostname);
      });
    });
  });
});
