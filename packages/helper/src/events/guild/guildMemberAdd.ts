import { Events, GuildMember, TextChannel } from 'discord.js';
import { EventInterface } from '../../types.js';
import { HelperClient } from '../../index.js';

const event: EventInterface = {
  name: Events.GuildMemberAdd,
  options: { once: false, rest: false },
  execute: async (member: GuildMember, client: HelperClient) => {
    const { guild, user } = member;

    const channel = guild.channels.cache.get(client.config.channels[2].id) as TextChannel;
    if (!channel) {
      console.warn("⚠️ Welcome channel not found!");
      return;
    }

    try {
      await channel.send(
        `Welcome <@${user.id}> to **${guild.name}**!`
      );
    } catch (err) {
      console.error("❌ Failed to send welcome message:", err);
    }
  },
};

export default event;
