import {
  assertInstagramTarget,
  parseAdbDevicesOutput,
  validateAdbSerial,
  validateAndroidPackage,
} from "../src/lib/android";

let failures = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) console.log(`  PASS  ${name}`);
  else {
    failures++;
    console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

console.log("Instara Crew Android runtime selftest\n");

const parsed = parseAdbDevicesOutput(`List of devices attached
emulator-5554 device product:sdk_gphone64_x86_64 model:sdk_gphone64_x86_64 device:emu64xa transport_id:1
R5CT11ABC unauthorized usb:1-2 transport_id:2
10.0.2.15:5555 offline product:test model:Pixel_7 device:panther transport_id:3
`);

check("ADB parser trova tre device", parsed.length === 3, JSON.stringify(parsed));
check("ADB parser modello normalizzato", parsed[0]?.model === "sdk gphone64 x86 64", parsed[0]?.model);
check("ADB parser conserva unauthorized", parsed[1]?.state === "unauthorized", parsed[1]?.state);
check("ADB parser conserva TCP serial", parsed[2]?.serial === "10.0.2.15:5555", parsed[2]?.serial);

check("Serial emulator valido", validateAdbSerial("emulator-5554") === "emulator-5554");
check("Serial TCP valido", validateAdbSerial("127.0.0.1:5555") === "127.0.0.1:5555");
check("Package Instagram valido", validateAndroidPackage("com.instagram.android") === "com.instagram.android");

let rejectedUnsafeSerial = false;
try {
  validateAdbSerial("emulator-5554; rm -rf /");
} catch {
  rejectedUnsafeSerial = true;
}
check("Serial con shell injection rifiutato", rejectedUnsafeSerial);

let rejectedLookalike = false;
try {
  assertInstagramTarget("https://instagram.com.evil.test/p/ABC/");
} catch {
  rejectedLookalike = true;
}
check("Dominio lookalike rifiutato", rejectedLookalike);

let rejectedHttp = false;
try {
  assertInstagramTarget("http://instagram.com/p/ABC/");
} catch {
  rejectedHttp = true;
}
check("HTTP rifiutato", rejectedHttp);
check(
  "Instagram HTTPS accettato",
  assertInstagramTarget("https://www.instagram.com/p/ABC/").hostname === "www.instagram.com"
);

if (failures) {
  console.error(`\n${failures} Android runtime check falliti.`);
  process.exit(1);
}

console.log("\nAndroid runtime checks superati.");
