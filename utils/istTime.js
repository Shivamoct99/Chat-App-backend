const istTime = async (isoDate) => {
  const date = new Date(isoDate);

  // Convert to Indian Standard Time (IST)
  const options = {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  };
  const istDate = await new Intl.DateTimeFormat("en-IN", options).format(date);
  return istDate;
};

module.exports = istTime;
