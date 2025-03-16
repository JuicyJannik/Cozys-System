const { Client, GatewayIntentBits, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, PermissionsBitField, ActivityType } = require('discord.js');
const dotenv = require('dotenv');
dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const supportRoleId = '1342234583986602116';  
const rulesRoleId = '1273371095126511697';
const blockedUserId = '781182318252523610';
const allowedChannelId = '1273369544425082968';
const prefix = '!';  
const userLevels = new Map();
const calculateLevelThreshold = (level) => {
  return (level + 1) * 10; 
};

client.once('ready', () => {
  console.log('Bot ist online!');
  client.user.setActivity('CozyDanny', { type: ActivityType.Listening });
});


client.on('messageCreate', async (message) => {
  if (message.channel.id === allowedChannelId) {
      if (message.content && !message.attachments.size) {
          try {
              await message.delete();
              console.log('Textnachricht gelöscht!');
          } catch (error) {
              console.error('Fehler beim Löschen der Nachricht:', error);
          }
      }

      if (message.attachments.size > 0) {
          const attachment = message.attachments.first();
          if (attachment.contentType && (attachment.contentType.startsWith('image/') || attachment.contentType.startsWith('video/'))) {
              console.log('Bilder/Videos erlaubt, keine Löschung erforderlich.');
          } else {
              try {
                  await message.delete();
                  console.log('Ungültiger Anhang gelöscht!');
              } catch (error) {
                  console.error('Fehler beim Löschen der Nachricht:', error);
              }
          }
      }
  }
});



client.on('messageCreate', async (message) => {
  if (message.author.bot) return; 

  const userId = message.author.id;
  const currentLevel = userLevels.get(userId) || 0;
  const currentThreshold = calculateLevelThreshold(currentLevel);

  const newMessageCount = (userLevels.get(userId + '_messages') || 0) + 1;

  if (newMessageCount >= currentThreshold) {
    const newLevel = currentLevel + 1;
    userLevels.set(userId, newLevel); 
    userLevels.set(userId + '_messages', 0);

    await message.channel.send(`<@${message.author.id}> has reached level ${newLevel}! 🎉`);
  } else {
    userLevels.set(userId + '_messages', newMessageCount);
  }
});



client.on('messageCreate', async (message) => {
  if (message.author.bot) return;  
  
  if (message.mentions.has(client.users.cache.get(blockedUserId))) {
    await message.delete();

    await message.author.send({
      content: `You are not allowed to mention this user.`,
    }).catch(err => console.error("Fehler beim Senden der Nachricht an den Benutzer:", err));
  }
});


client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.toLowerCase().startsWith(`${prefix}giveaway`)) {
    const args = message.content.slice(prefix.length).trim().split(' ');
    const prize = args[1]; 
    const timeString = args[2]; 
    const host = args.slice(3).join(' '); 

    if (!prize || !timeString || !host) {
      return message.reply("Bitte gib alle Argumente an: !giveaway <preis> <zeit> <host>");
    }

    function parseTimeString(timeString) {
      let days = 0, hours = 0, minutes = 0;

      const dayMatch = timeString.match(/(\d+)(d)/);
      if (dayMatch) {
        days = parseInt(dayMatch[1], 10);
        timeString = timeString.replace(dayMatch[0], ''); 
      }

      const hourMatch = timeString.match(/(\d+)(h)/);
      if (hourMatch) {
        hours = parseInt(hourMatch[1], 10);
        timeString = timeString.replace(hourMatch[0], ''); 
      }

      const minuteMatch = timeString.match(/(\d+)(m)/);
      if (minuteMatch) {
        minutes = parseInt(minuteMatch[1], 10);
      }

      const timeInMs = (days * 24 * 60 * 60 * 1000) + (hours * 60 * 60 * 1000) + (minutes * 60 * 1000);
      return timeInMs;
    }

    const timeInMs = parseTimeString(timeString);

    if (!timeInMs) {
      return message.reply("Ungültiges Zeitformat. Bitte verwende ein gültiges Zeitformat wie '1d2h15m'.");
    }

    const giveawayEmbed = new EmbedBuilder()
      .setColor(0x00FF00) 
      .setTitle(`🎉 **Giveaway: ${prize}** 🎉`)
      .setDescription(`Klicke auf den Button unten, um teilzunehmen!\n\n**Preis:** ${prize}\n**Gastgeber:** ${host}`)
      .addFields(
        { name: 'Preis', value: prize, inline: true },
        { name: 'Gastgeber', value: host, inline: true },
        { name: 'Endet in:', value: `Berechnung...`, inline: false }
      )
      .setFooter({ text: 'Viel Glück an alle Teilnehmer!' })
      .setTimestamp();

    const participateButton = new ButtonBuilder()
      .setCustomId('giveaway_participate')
      .setLabel('🎉 Teilnehmen')
      .setStyle(ButtonStyle.Primary); 

    const row = new ActionRowBuilder().addComponents(participateButton);

    const giveawayMessage = await message.channel.send({ embeds: [giveawayEmbed], components: [row] });

    let participants = [];

    const countdown = setInterval(async () => {
      const now = Date.now();
      const remainingTime = timeInMs - (now - giveawayMessage.createdTimestamp);

      if (remainingTime <= 0) {
        clearInterval(countdown); 

        if (participants.length === 0) {
          return message.channel.send("Keine Teilnehmer, das Giveaway wird abgebrochen.");
        }

        const winner = participants[Math.floor(Math.random() * participants.length)];

        const winnerEmbed = new EmbedBuilder()
          .setColor(0xFFFF00)
          .setTitle(`🎉 **Giveaway Gewinner** 🎉`)
          .setDescription(`Herzlichen Glückwunsch <@${winner}>, du hast **${prize}** gewonnen! 🎉`)
          .setFooter({ text: 'Danke an alle Teilnehmer!' })
          .setTimestamp();

        await message.channel.send({ embeds: [winnerEmbed] });
        return giveawayMessage.delete();
      }

      const remainingDays = Math.floor(remainingTime / (1000 * 60 * 60 * 24));
      const remainingHours = Math.floor((remainingTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const remainingMinutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
      const remainingSeconds = Math.floor((remainingTime % (1000 * 60)) / 1000);

      const updatedEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle(`🎉 **Giveaway: ${prize}** 🎉`)
        .setDescription(`Klicke auf den Button unten, um teilzunehmen!\n\n**Preis:** ${prize}\n**Gastgeber:** ${host}`)
        .addFields(
          { name: 'Preis', value: prize, inline: true },
          { name: 'Gastgeber', value: host, inline: true },
          { name: 'Endet in:', value: `${remainingDays}d ${remainingHours}h ${remainingMinutes}m ${remainingSeconds}s`, inline: false }
        )
        .setFooter({ text: 'Viel Glück an alle Teilnehmer!' })
        .setTimestamp();

      await giveawayMessage.edit({ embeds: [updatedEmbed] });
    }, 1000); 
  }
});

let participants = [];
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'giveaway_participate') {
    await interaction.deferUpdate();

    const userId = interaction.user.id;
    if (!participants.includes(userId)) {
      participants.push(userId);
    }

    await interaction.followUp({
      content: 'Du hast am Giveaway teilgenommen! 🎉 Viel Glück!',
      ephemeral: true, 
    });
  }
});



client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.toLowerCase() === `${prefix}rules`) {
    const rulesEmbed = new EmbedBuilder()
      .setColor(0x0099ff) 
      .setTitle('📜 **Server Rules** 📜')
      .setDescription(`
       **1. Friendly and respectful interaction is mandatory at all times!

        2. The instructions of administrators (Discord admin -> C. Manager -> Owner) must always be followed.

        3. Third-party advertising is prohibited.

        4. Tagging / pinging / marking users & user ranks without reason is prohibited.

        5. No inappropriate profiles (user names, avatars, accounts and status). This includes empty user names, unusual Unicode characters or excessively long user names.

        6. Sharing personal data is prohibited.

        7. NSFW content (pornography etc.) is prohibited in all channels.

        8. Spamming is prohibited.

        9. Trolling is prohibited.

        10. Stick to the channel topics and hold conversations in the appropriate channels.

        11. No Pictures or Videos in General or German Chat.

        12. No racism, sexism, discrimination, hate speech, or similar behavior.

        13. No political or religious discussions.

        14. Only** Acc links **TikTok, Instagram or Youtube links are allowed. 

        15. Administrators have the final say.

        To View all the Channels, Accept the Rules**
      `)
      .setFooter({ text: 'Accept the Rules, to view all the Channels.' })
      .setTimestamp();

    const acceptButton = new ButtonBuilder()
      .setCustomId('accept_rules')
      .setLabel('Accept Rules')
      .setStyle(ButtonStyle.Success); 

    const row = new ActionRowBuilder().addComponents(acceptButton);

    await message.channel.send({
      embeds: [rulesEmbed],
      components: [row],
    });
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'accept_rules') {
    try {
      const member = interaction.member;
      const role = interaction.guild.roles.cache.get(rulesRoleId);

      if (role) {
        await member.roles.add(role);
        await interaction.reply({ content: 'You Accepted the Rules! 🎉 Have fun ^.^', ephemeral: true });
      } else {
        await interaction.reply({ content: 'Die Rolle konnte nicht gefunden werden.', ephemeral: true });
      }
    } catch (error) {
      console.error('Fehler beim Hinzufügen der Rolle: ', error);
      await interaction.reply({ content: 'Es gab ein Problem beim Hinzufügen der Rolle. Bitte versuche es später erneut.', ephemeral: true });
    }
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.toLowerCase() === `${prefix}ticket`) {
    const ticketButton = new ButtonBuilder()
      .setCustomId('open_ticket')
      .setLabel('Open a Ticket')
      .setStyle(ButtonStyle.Primary); 

    const row = new ActionRowBuilder().addComponents(ticketButton);

    const embed = new EmbedBuilder()
      .setColor(0x3498db) 
      .setTitle(' **🎟️ | Support** ')
      .setDescription(
        'Do you need help or just have questions, you would like to ask a team member? Then you can open a support ticket here.'
      )
      .setFooter({ text: 'The support team will be happy to help you!' })
      .setTimestamp();

    return message.channel.send({
      embeds: [embed],
      components: [row],
    });
  }
});

client.on('guildMemberAdd', async (member) => {
  try {
    const welcomeChannel = member.guild.channels.cache.get('1273368299811639386'); 

    if (!welcomeChannel) return;

    const welcomeEmbed = new EmbedBuilder()
      .setColor(0x00ff00) 
      .setTitle('Welcome!')
      .setDescription(`Hello ${member.user.tag}, welcome! Nice that you are here!`)
      .setThumbnail(member.user.displayAvatarURL())
      .setFooter({ text: 'Let us know, when you need help!' })
      .setTimestamp();

    await welcomeChannel.send({ embeds: [welcomeEmbed] });

    await member.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('Welcome!')
          .setDescription(`Hello ${member.user.tag}, welcome to the Cozy-Gang! Nice that you are here!`)
          .setFooter({ text: 'Let us know, when you need help!' })
          .setTimestamp(),
      ],
    });
  } catch (error) {
    console.error('Fehler bei der Willkommensnachricht: ', error);
  }
});


client.on('messageCreate', async (message) => {
  const restrictedChannelIds = ['1273369464498552965', '1273939285568913450'];

  if (restrictedChannelIds.includes(message.channel.id) && (message.attachments.size > 0 || message.content.includes('http') && message.content.match(/\.(jpeg|jpg|gif|png|mp4|webm)$/))) {
    try {
      await message.delete();

      await message.author.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('Warning: Image/Video not allowed')
            .setDescription('Hello! It seems like you tried to send an image or video in a restricted channel. Please be aware that posting media files is not allowed here. Please make sure to follow the server rules.')
            .setFooter({ text: 'Please review the server rules.' })
            .setTimestamp(),
        ],
      });

      console.log(`User ${message.author.tag} was warned for sending an image/video in a restricted channel.`);
    } catch (error) {
      console.error('Error while deleting message or sending DM:', error);
    }
  }
});


client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'open_ticket') {
    try {
      const user = interaction.user;

      console.log("Erstelle Ticket für Benutzer: ", user.tag);

      const channel = await interaction.guild.channels.create({
        name: `ticket-${user.username}`,
        type: 0,  
        topic: `Support-Ticket von ${user.tag}`,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: user.id,
            allow: [PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: supportRoleId,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
          },
        ],
      });

      console.log("Ticket-Kanal erstellt: ", channel.name);

      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('🔧 **Support-Ticket** 🔧')
        .setDescription(`Hello ${user}, your support ticket has been opened successfully. A support member will contact you soon.\n\nIf you would like to close the ticket, click the button below`)
        .setFooter({ text: 'The Team will contact you soon.' })
        .setTimestamp()
        .addFields([
          { name: "Ticket-Status", value: "🔑 **Is being processed**", inline: true },
          { name: "Support-Team", value: "🔧 **Will help soon!**", inline: true }
        ]);

      const closeButton = new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('Ticket schließen')
        .setStyle(ButtonStyle.Danger);

      const claimButton = new ButtonBuilder()
        .setCustomId('claim_ticket')
        .setLabel('Ticket claimen')
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder().addComponents(closeButton, claimButton);

      await channel.send({
        embeds: [embed],
        components: [row],
      });

      await interaction.reply({ content: `Your ticket has been created! Check out the Channel: ${channel} for more Information.`, ephemeral: true });
    } catch (error) {
      console.error("Fehler beim Erstellen des Tickets: ", error);
      await interaction.reply({ content: `There was a problem by creating the Support Ticket. Please try again later.`, ephemeral: true });
    }
  }

  if (interaction.customId === 'claim_ticket') {
    const channel = interaction.channel;
    const user = interaction.user;

    if (channel.name.startsWith('ticket-')) {
      if (!interaction.member.roles.cache.has(supportRoleId)) {
        return interaction.reply({ content: 'You do not have permissions to claim this Ticket.', ephemeral: true });
      }

      try {
        await interaction.deferUpdate();

        const embed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle(' **🎟️ | Support** ')
          .setDescription(`Hello ${user}, This Ticket has now been claimed by a support team member.`)
          .setFooter({ text: 'The Team will contact you soon.' })
          .setTimestamp()
          .addFields([
            { name: "Ticket-Status", value: "🛠 **Claimed**", inline: true },
            { name: "Support-Team", value: `🔧 **Claimed from ${user.tag}**`, inline: true }
          ]);

        await channel.send(`<@${user.id}> has claimed the Ticket!`);

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('claim_ticket')
            .setLabel('Ticket geclaimed')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
        );

        await channel.messages.fetch({ limit: 1 }).then(async (messages) => {
          const firstMessage = messages.first();
          await firstMessage.edit({ embeds: [embed], components: [row] });
        });

        await interaction.followUp({ content: 'You have successfully claimed the Ticket!', ephemeral: true });
      } catch (error) {
        console.error("Fehler beim Claimen des Tickets: ", error);
        await interaction.reply({ content: 'There was a problem claiming the Ticket. Please try again later', ephemeral: true });
      }
    }
  }

  if (interaction.customId === 'close_ticket') {
    const channel = interaction.channel;

    if (channel.name.startsWith('ticket-')) {
      const user = interaction.user;

      const hasPermission = channel.permissionOverwrites.cache.some(
        (overwrite) => overwrite.id === user.id && overwrite.allow.has(PermissionsBitField.Flags.ViewChannel)
      );

      if (!hasPermission && !interaction.member.roles.cache.has(supportRoleId)) {
        return interaction.reply({ content: 'You do not have permissions to close this Ticket', ephemeral: true });
      }

      try {
        await interaction.deferReply({ ephemeral: true });

        const transcriptChannel = await interaction.guild.channels.create({
          name: `transcript-${channel.name}`,
          type: 0,  
          topic: `Transcript für Ticket von ${user.tag}`,
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              deny: [PermissionsBitField.Flags.ViewChannel],
            },
            {
              id: supportRoleId,
              allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
            },
            {
              id: user.id,
              allow: [PermissionsBitField.Flags.ViewChannel],
            },
          ],
        });

        const messages = await channel.messages.fetch({ limit: 100 });

        let transcript = '';
        for (const msg of messages.reverse()) {
          const message = msg[1]; 
          const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setDescription(`${message.author.tag}: ${message.content}`)
            .setTimestamp(message.createdAt);

          if (message.attachments.size > 0) {
            message.attachments.forEach((attachment) => {
              embed.setImage(attachment.url);
            });
          }

          await transcriptChannel.send({ embeds: [embed] });
        }

        const confirmationEmbed = new EmbedBuilder()
          .setColor(0xff0000)
          .setDescription(`The Ticket was successfully closed. Thank you, ${user.username}, for your inquiry.`);

        await interaction.followUp({ content: 'Closing the Ticket...', embeds: [confirmationEmbed], ephemeral: true });

        await channel.delete();
      } catch (error) {
        console.error('Fehler beim Schließen des Tickets: ', error);
        await interaction.followUp({ content: 'There was a problem closing the Ticket. Please try again later.', ephemeral: true });
      }
    }
  }
});

client.login(process.env.DISCORD_TOKEN); 
