#!/usr/bin/env ts-node-script

"use strict";

import { exec } from "child_process";
import { existsSync, readFile } from "fs";
import neatCsv from "neat-csv";
import path from "path";
import { debuglog } from "util";

const debug = debuglog("app");

interface Configuration {
  allowedLicenses: string[];
}

const CONFIG_FILE_NAME = ".license-check-node.json";

function loadConfiguration(directory: string): Promise<Configuration> {
  let configFileName = path.join(directory, CONFIG_FILE_NAME);

  if (!existsSync(configFileName)) {
    debug("No file found, using default configuration.");
    return new Promise((resolve) => {
      resolve({
        allowedLicenses: [],
      });
    });
  }

  return new Promise((resolve, reject) => {
    readFile(configFileName, (err, data) => {
      if (err) {
        reject(err);
      }

      let jsonData = JSON.parse(data.toString());
      resolve({
        allowedLicenses: jsonData.allowedLicenses,
      });
    });
  });
}

function extractUsedLicenses(directory: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let command =
      path.dirname(process.argv[1]) +
      "/node_modules/.bin/license-checker --csv";

    debug("Running license checker command: " + command);

    exec(command, { cwd: directory }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      }

      debug("license checker stdout: " + stdout);
      debug("license checker stderr: " + stderr);

      resolve(stdout);
    });
  });
}

async function parseLicenseScannerOutput(output: string): Promise<string[]> {
  let packages = await neatCsv(output);
  let licenses = await packages.map((npmPackage) => {
    return npmPackage["license"];
  });

  return [...new Set(licenses)];
}

async function extractForbiddenLicenses(
  configuration: Configuration,
  usedLicenses: string[]
): Promise<string[]> {
  return usedLicenses.filter((license) => {
    return configuration.allowedLicenses.indexOf(license) < 0;
  });
}

async function checkLicenses(packageFile: string): Promise<boolean> {
  let directory = path.dirname(packageFile);
  debug("Scanning licenses for " + directory);

  let configuration = await loadConfiguration(directory);
  let licenseOutput = await extractUsedLicenses(directory);
  let usedLicenses = await parseLicenseScannerOutput(licenseOutput);
  let forbiddenLicenses = await extractForbiddenLicenses(
    configuration,
    usedLicenses
  );

  if (forbiddenLicenses.length > 0) {
    showErrorMessage(directory, forbiddenLicenses);
    return false;
  }

  return true;
}

export function showErrorMessage(
  directory: string,
  forbiddenLicenses: string[]
) {
  let demoConfiguration: Configuration = { allowedLicenses: forbiddenLicenses };

  console.log("**************************************************************");
  console.log(
    "Not all licenses used in directory " + directory + " are allowed."
  );
  console.log();
  console.log(
    "If you want to allow these licenses, please put the following lines into"
  );
  console.log(
    "the allow list file: " + path.join(directory, CONFIG_FILE_NAME) + ": "
  );
  console.log();
  console.log(JSON.stringify(demoConfiguration, null, 2));
  console.log();
  console.log("**************************************************************");
}

function main() {
  Promise.all(process.argv.slice(2).map(checkLicenses)).then((result) => {
    let allOk = result.every((v) => v === true);
    if (!allOk) {
      process.exit(1);
    }
  });
}

main();
