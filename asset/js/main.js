"use strict";

const menuToggle = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#navigation");
const compactScreen = window.matchMedia("(max-width: 690px)");

function setMenu(expanded) {
  navigation.hidden = compactScreen.matches && !expanded;
  menuToggle.hidden = !compactScreen.matches;
  menuToggle.setAttribute("aria-expanded", String(compactScreen.matches && expanded));
}

setMenu(false);
compactScreen.addEventListener("change", () => setMenu(false));
menuToggle.addEventListener("click", () => setMenu(navigation.hidden));
navigation.addEventListener("click", (event) => {
  if (compactScreen.matches && event.target.closest("a")) {
    setMenu(false);
    menuToggle.focus({ preventScroll: true });
  }
});
document.querySelector(".site-header").addEventListener("keydown", (event) => {
  if (event.key === "Escape" && compactScreen.matches && !navigation.hidden) {
    setMenu(false);
    menuToggle.focus();
  }
});

const rooms = {
  garden: { name: "Garden King", capacity: 2, rate: 4900 },
  balcony: { name: "Balcony King", capacity: 2, rate: 6400 },
  family: { name: "Family Suite", capacity: 4, rate: 9800 },
};
const packages = {
  weekend: { name: "Slow Weekend", room: "garden", rate: 11500 },
  surf: { name: "Surf & Stay", room: "balcony", rate: 14500 },
};
const day = 86400000;
const pesos = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});
const displayDate = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});
const manilaDate = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function offsetDate(value, offset) {
  return new Date(Date.parse(value) + offset * day).toISOString().slice(0, 10);
}

const dateParts = Object.fromEntries(manilaDate.formatToParts(new Date()).map(({ type, value }) => [type, value]));
const today = [dateParts.year, dateParts.month, dateParts.day].join("-");
const form = document.querySelector("#stay-form");
const arrival = document.querySelector("#check-in");
const departure = document.querySelector("#check-out");
const guests = document.querySelector("#guests");
const results = document.querySelector("#stay-results");
const summary = document.querySelector("#stay-summary");
const roomResults = document.querySelector("#room-results");
const packageSelection = document.querySelector("#package-selection");
const packageName = document.querySelector("#selected-package-name");
const applyPackageTerms = document.querySelector("#apply-package-terms");
const dialog = document.querySelector("#inquiry-dialog");
const inquiryForm = document.querySelector("#inquiry-form");
const inquiryDetails = document.querySelector("#inquiry-details");
const inquiryStatus = document.querySelector("#inquiry-status");
const confirmInquiry = document.querySelector("#confirm-inquiry");
let preference = {};

arrival.min = today;
arrival.max = offsetDate(today, 364);
arrival.value = offsetDate(today, 1);
departure.min = offsetDate(arrival.value, 1);
departure.max = offsetDate(today, 366);
departure.value = offsetDate(arrival.value, 2);
form.querySelector('button[type="submit"]').disabled = false;

arrival.addEventListener("input", () => {
  if (arrival.validity.valid) {
    departure.min = offsetDate(arrival.value, 1);
    if (departure.value < departure.min) departure.value = departure.min;
  }
});

form.addEventListener("input", () => {
  results.hidden = true;
  updatePackageTerms();
});

function nightCount() {
  return (departure.valueAsNumber - arrival.valueAsNumber) / day;
}

function updatePackageTerms() {
  applyPackageTerms.hidden = !preference.package || (nightCount() === 2 && guests.value === "2");
}

function selectStay(room, packageId) {
  preference = { room, package: packageId };
  packageSelection.hidden = !packageId;
  packageName.textContent = packageId ? `${packages[packageId].name} · 2 nights for 2 guests` : "";
  updatePackageTerms();
}

applyPackageTerms.addEventListener("click", () => {
  if (!arrival.reportValidity()) return;
  departure.value = offsetDate(arrival.value, 2);
  guests.value = "2";
  updatePackageTerms();
  form.requestSubmit();
});

document.querySelector("#clear-package").addEventListener("click", () => {
  selectStay();
  results.hidden = true;
  form.querySelector('button[type="submit"]').focus();
});

function displayInquiry(label, total, dateRange, party) {
  inquiryDetails.textContent = `${label} · ${dateRange} · ${party} · ${pesos.format(total)} estimated total`;
  inquiryStatus.hidden = true;
  confirmInquiry.hidden = false;
  dialog.showModal();
}

function addResult(label, total, dateRange, party) {
  const row = document.createElement("div");
  row.className = "result-row";
  const details = document.createElement("p");
  const name = document.createElement("strong");
  name.textContent = label;
  details.append(name, ` · ${pesos.format(total)} total`);
  const button = document.createElement("button");
  button.className = "text-button";
  button.type = "button";
  button.textContent = "Preview inquiry";
  button.setAttribute("aria-label", `Preview inquiry for ${label}`);
  button.addEventListener("click", () => displayInquiry(label, total, dateRange, party));
  row.append(details, button);
  roomResults.append(row);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const nights = nightCount();
  const count = Number(guests.value);
  const dateRange = `${displayDate.format(arrival.valueAsNumber)} – ${displayDate.format(departure.valueAsNumber)}`;
  const party = `${count} ${count === 1 ? "guest" : "guests"}`;
  const duration = `${nights} ${nights === 1 ? "night" : "nights"}`;
  const choices = Object.entries(rooms).filter(([, room]) => room.capacity >= count);
  const requestedRoom = rooms[preference.room];
  const requestedPackage = packages[preference.package];

  roomResults.replaceChildren();
  if (requestedPackage) {
    if (nights === 2 && count === 2) {
      addResult(requestedPackage.name, requestedPackage.rate, dateRange, party);
    } else {
      const note = document.createElement("p");
      note.textContent = `${requestedPackage.name} is for exactly two nights and two guests. Standard room rates are shown below.`;
      roomResults.append(note);
    }
  }
  if (requestedRoom && requestedRoom.capacity < count) {
    const note = document.createElement("p");
    note.textContent = `${requestedRoom.name} sleeps up to ${requestedRoom.capacity} guests. See the rooms that fit your group below.`;
    roomResults.append(note);
  }
  choices.sort(([first], [second]) => Number(second === preference.room) - Number(first === preference.room));
  for (const [, room] of choices) {
    addResult(room.name, room.rate * nights, dateRange, party);
  }

  summary.textContent = `${duration} for ${party} · ${dateRange}`;
  results.hidden = false;
  summary.focus({ preventScroll: true });
  document.querySelector("#stay").scrollIntoView({ block: "start" });
});

for (const button of document.querySelectorAll("[data-room], [data-package]")) {
  button.disabled = false;
  button.addEventListener("click", () => {
    if (button.dataset.package) {
      const packageId = button.dataset.package;
      selectStay(packages[packageId].room, packageId);
    } else {
      selectStay(button.dataset.room);
    }
    document.querySelector("#stay").scrollIntoView({ block: "start" });
    form.requestSubmit();
  });
}

inquiryForm.addEventListener("submit", (event) => {
  if (event.submitter !== confirmInquiry) return;
  event.preventDefault();
  inquiryStatus.hidden = false;
  inquiryStatus.textContent = "Inquiry preview complete. No reservation was sent.";
  dialog.querySelector(".dialog-close").focus();
  confirmInquiry.hidden = true;
});
