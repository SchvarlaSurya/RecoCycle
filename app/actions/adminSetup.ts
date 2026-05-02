"use server";

import { clerkClient } from "@clerk/nextjs/server";

export async function setUserAsAdmin(userId: string) {
  try {
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        isAdmin: true,
      },
    });
    return { success: true, message: `User ${userId} is now an admin.` };
  } catch (error) {
    console.error("Error setting admin:", error);
    return { success: false, error: String(error) };
  }
}

export async function findUserByEmail(email: string) {
  try {
    const client = await clerkClient();
    const users = await client.users.getUserList({
      emailAddress: [email],
      limit: 1,
    });

    if (users.data.length === 0) {
      return { success: false, error: "User not found" };
    }

    const user = users.data[0];
    return {
      success: true,
      user: {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.publicMetadata?.isAdmin === true,
      }
    };
  } catch (error) {
    console.error("Error finding user:", error);
    return { success: false, error: String(error) };
  }
}

export async function listAllUsers() {
  try {
    const client = await clerkClient();
    const users = await client.users.getUserList({ limit: 100 });

    return {
      success: true,
      users: users.data.map(u => ({
        id: u.id,
        email: u.emailAddresses[0]?.emailAddress,
        firstName: u.firstName,
        lastName: u.lastName,
        isAdmin: u.publicMetadata?.isAdmin === true,
      }))
    };
  } catch (error) {
    console.error("Error listing users:", error);
    return { success: false, error: String(error) };
  }
}