import pkg from "@clerk/clerk-sdk-node";
const { default: Clerk } = pkg;

const clerk = new Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

async function main() {
  const email = process.argv[2];

  if (!email) {
    // List all users
    const users = await clerk.users.getUserList({ limit: 100 });
    console.log("\n📋 All Users:");
    console.log("─".repeat(60));
    for (const u of users) {
      const isAdmin = u.publicMetadata?.isAdmin === true;
      const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || "No name";
      console.log(`${isAdmin ? "✅" : "○"} ${name} <${u.emailAddresses[0]?.emailAddress}>`);
      console.log(`   ID: ${u.id} | Admin: ${isAdmin}`);
      console.log("");
    }
    return;
  }

  // Find and set admin by email
  const users = await clerk.users.getUserList({
    emailAddress: [email],
    limit: 1,
  });

  if (users.length === 0) {
    console.log(`❌ User with email ${email} not found`);
    process.exit(1);
  }

  const user = users[0];
  console.log(`\n👤 Found user: ${user.firstName || ""} ${user.lastName || ""}`);
  console.log(`   Email: ${user.emailAddresses[0]?.emailAddress}`);
  console.log(`   ID: ${user.id}`);
  console.log(`   Current Admin: ${user.publicMetadata?.isAdmin === true ? "Yes ✅" : "No"}`);

  // Update metadata
  await clerk.users.updateUserMetadata(user.id, {
    publicMetadata: { isAdmin: true },
  });

  console.log(`\n✅ User ${email} is now an ADMIN!`);
}

main().catch(console.error);