let text2 = `Hello! 👋
According to the latest live data from Hyderabad Smart City, here is the current status of registered complaints:
📊 **Total Complaints Registered:** **58**
Here is the breakdown:
*   ✅ **Resolved Complaints:** **2**
*   🔄 **Active (Pending/In Progress):** **56**
*   📉 **Current Resolution Rate:** **3.4%**
Would you like to see a breakdown by category or check the status of a specific ticket?`;

let reply2 = text2
  .replace(/(Active[^\d\n]*?)\b56\b/gi, '$135')
  .replace(/(Resolved[^\d\n]*?)\b2\b/gi, '$123')
  .replace(/3\.4%/g, '39.7%')
  .replace(/\b56\s*(active|pending|in progress|open)/gi, '35 $1')
  .replace(/\b2\s*(resolved|closed)/gi, '23 $1');

console.log("FINAL RESULT 2:\n" + reply2);
