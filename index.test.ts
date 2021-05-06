import { mkdtemp, writeFile } from "fs";
import { join } from "path";
import {
  Configuration,
  CONFIG_FILE_NAME,
  loadConfiguration,
  showErrorMessage,
} from "./index";

test("showErrorMessage() should run", () => {
  showErrorMessage("/tmp", []);
});

test("loadConfiguration() should return empty config by default", () => {
  mkdtemp("tests-", (err, directory) => {
    expect(err).toBeNull();
    loadConfiguration(directory).then((configuraton) => {
      expect(configuraton).toEqual({ allowedLicenses: [] });
    });
  });
});

test("loadConfiguration() should return config if file exists", () => {
  mkdtemp("./tests/tests-", (err, directory) => {
    expect(err).toBeNull();

    let demoConfiguration: Configuration = { allowedLicenses: ["MIT", "GPL"] };
    writeFile(
      join(directory, CONFIG_FILE_NAME),
      JSON.stringify(demoConfiguration),
      (err) => {
        expect(err).toBeNull();

        loadConfiguration(directory).then((configuraton) => {
          expect(configuraton).toEqual(demoConfiguration);
        });
      }
    );
  });
});
