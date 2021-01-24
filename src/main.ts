import fs from 'fs'
import path from 'path'
import * as core from '@actions/core'

import Client from './client'

interface Credentials {
  host: string;
  username: string;
  password: string;
}

function parseClusterTags(input: string): Map<string,string> {
  return input.trim().split(/(\r?\n)+/).reduce(
    (acc, line) => {
      const [k,v] = line.split(":", 2)
      if (k && v) {
        return acc.set(k.trim(), v.trim());
      }
      return acc;
    }
  , new Map<string,string>());
}

// TODO handle wrong credentials
export async function getKubeconfigFromSpectroCloud(cred: Credentials, projectName: string, clusterName: string, clusterTags: Map<string,string>) {
  if (!clusterName && !clusterTags.size) {
    throw new Error('either clusterName or clusterTags are required');
  }

  const c = new Client(cred.host, cred.username, cred.password);
  const projectUid = await c.getProjectUID(projectName);
  const clusterUid = await c.getClusterUID(projectUid, clusterName, clusterTags);
  const kubeconfig = await c.getClusterKubeconfig(projectUid, clusterUid);
  return kubeconfig;
}

async function getKubeconfig() {
  const credentials = {
    host: core.getInput('host'),
    username: core.getInput('username', {required : true}),
    password: core.getInput('password', {required : true}),
  }
  const projectName =  core.getInput('projectName', {required : true});
  const clusterName =  core.getInput('clusterName');
  const clusterTags =  parseClusterTags(core.getInput('clusterTags'));


  return getKubeconfigFromSpectroCloud(credentials, projectName, clusterName, clusterTags);
}

export async function run() {
  let kubeconfig = await getKubeconfig();
  const runnerTempDirectory = (process.env['RUNNER_TEMP'] as string); // Using process.env until the core libs are updated
  const kubeconfigPath = path.join(runnerTempDirectory, `kubeconfig_${Date.now()}`);
  core.debug(`Writing kubeconfig contents to ${kubeconfigPath}`);
  fs.writeFileSync(kubeconfigPath, kubeconfig);
  fs.chmodSync(kubeconfigPath, '600');
  core.exportVariable('KUBECONFIG', kubeconfigPath);
  console.log('KUBECONFIG environment variable is set');
}

run().catch(core.setFailed);
