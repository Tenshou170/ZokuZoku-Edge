import os from 'os';
import path from 'path';
import { PYMPORT_DIR, PYTHON_PACKAGES_DIR } from '../defines';

export interface PythonEnvironment extends NodeJS.ProcessEnv {
    PYTHONHOME: string;
    PYTHONPATH: string;
    SSL_CERT_FILE: string;
    LD_LIBRARY_PATH?: string;
    OPENSSL_CONF?: string;
}

/**
 * Gets the environment variables required for the Python bridge and initial setup.
 * Consolidates the logic previously duplicated in extension.ts and pythonBridge.ts.
 */
export function getPythonEnvironment(): PythonEnvironment {
    const env: PythonEnvironment = {
        ...process.env,
        PYTHONHOME: PYMPORT_DIR,
        SSL_CERT_FILE: path.join(PYMPORT_DIR, 'cacert.pem'),
        PYTHONPATH: "" // Initialized below
    };

    const oldPythonPath = process.env.PYTHONPATH;
    env.PYTHONPATH = oldPythonPath
        ? `${PYTHON_PACKAGES_DIR}${path.delimiter}${oldPythonPath}`
        : PYTHON_PACKAGES_DIR;

    const platform = os.platform();
    if (platform === 'linux') {
        const libDir = path.join(PYMPORT_DIR, 'lib');
        env.LD_LIBRARY_PATH = env.LD_LIBRARY_PATH ? `${libDir}:${env.LD_LIBRARY_PATH}` : libDir;
        env.OPENSSL_CONF = '/dev/null';
    } else if (platform === 'win32') {
        env.PATH = env.PATH ? `${PYMPORT_DIR};${env.PATH}` : PYMPORT_DIR;
    }

    return env;
}

/**
 * Applies the Python environment to the current process.
 * Useful during initial setup to ensure the current process has the correct environment.
 */
export function applyPythonEnvironment() {
    const env = getPythonEnvironment();
    
    process.env.PYTHONHOME = env.PYTHONHOME;
    process.env.PYTHONPATH = env.PYTHONPATH;
    process.env.SSL_CERT_FILE = env.SSL_CERT_FILE;
    
    if (env.LD_LIBRARY_PATH) {
        process.env.LD_LIBRARY_PATH = env.LD_LIBRARY_PATH;
    }
    if (env.OPENSSL_CONF) {
        process.env.OPENSSL_CONF = env.OPENSSL_CONF;
    }
    if (env.PATH) {
        process.env.PATH = env.PATH;
    }
}
