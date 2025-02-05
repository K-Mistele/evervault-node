const certHelper = require('./certHelper');
const { CageAttestationError } = require('./errors');
const tls = require('tls');
const origCreateSecureContext = tls.createSecureContext;
const origCheckServerIdentity = tls.checkServerIdentity;

const attestationBindings = loadAttestationBindings();

function loadAttestationBindings() {
  try {
    return require('evervault-attestation-bindings');
  } catch (_) {
    return null;
  }
}

function hasAttestationBindings() {
  return attestationBindings != null;
}

async function trustCagesRootCA(evClient) {
  const pem = await evClient.getCagesCert();
  let cert = pem.toString();
  x509 = certHelper.parseX509(cert);
  tls.createSecureContext = (options) => {
    const context = origCreateSecureContext(options);
    context.context.addCACert(pem);
    return context;
  };
}

function parseCageNameFromHost(hostname) {
  const hostnameTokens = hostname.split('.');
  // Check if nonce prefix is present
  if (hostnameTokens[1] === 'attest') {
    return hostnameTokens[2];
  } else {
    return hostnameTokens[0];
  }
}

function attestCageConnection(hostname, cert, cagesAttestationInfo = {}) {
  try {
    if (!hasAttestationBindings()) {
      throw new CageAttestationError(
        'Cage attestation bindings have not been installed.',
        hostname,
        cert
      );
    }
    // Pull cage name from cage hostname
    const cageName = parseCageNameFromHost(hostname);
    // check if PCRs for this cage have been given
    const pcrs = cagesAttestationInfo[cageName];
    var pcrsList = [];
    if (Array.isArray(pcrs)) {
      pcrsList = pcrs;
    } else if (typeof pcrs === 'object') {
      pcrsList = [pcrs];
    }
    const isConnectionValid = attestationBindings.attestConnection(
      cert.raw,
      pcrsList
    );
    if (!isConnectionValid) {
      console.warn(
        `EVERVAULT WARN :: Connection to Cage ${cageName} failed attestation`
      );
      throw new CageAttestationError(
        `Attestation to ${cageName} failed`,
        hostname,
        cert
      );
    }
  } catch (err) {
    console.error(
      `EVERVAULT ERROR :: An unexpected error occurred while attempting to attest a connection to your Cage`,
      err.message
    );
    return err;
  }
}

function addAttestationListener(config, cagesAttestationInfo) {
  tls.checkServerIdentity = function (hostname, cert) {
    // only attempt attestation if the host is a cage
    if (hostname.endsWith(config.cagesHostname)) {
      // we expect undefined when attestation is successful, else an error
      const attestationResult = attestCageConnection(
        hostname,
        cert,
        cagesAttestationInfo
      );
      if (attestationResult != null) {
        return attestationResult;
      }
    }
    // always perform base checks
    return origCheckServerIdentity(hostname, cert);
  };
}

module.exports = {
  trustCagesRootCA,
  addAttestationListener,
  attestCageConnection,
  parseCageNameFromHost,
  hasAttestationBindings,
};
