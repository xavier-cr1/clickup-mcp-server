/**
 * Configuration handling for ClickUp API credentials
 *
 * The required environment variables (CLICKUP_API_KEY and CLICKUP_TEAM_ID) are passed 
 * securely to this file when running the hosted server at smithery.ai. Optionally, 
 * they can be parsed via command line arguments when running the server locally.
 */

// Parse any command line environment arguments
const args = process.argv.slice(2);
const envArgs: { [key: string]: string } = {};
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--env' && i + 1 < args.length) {
    const [key, value] = args[i + 1].split('=');
    if (key === 'CLICKUP_API_KEY') envArgs.clickupApiKey = value;
    if (key === 'CLICKUP_TEAM_ID') envArgs.clickupTeamId = value;
    i++;
  }
}

// Define required configuration interface
interface Config {
  clickupApiKey: string;
  clickupTeamId: string;
  enableSponsorMessage: boolean;
  sponsorUrl: string;
}

// Load configuration from command line args or environment variables
const configuration: Config = {
  clickupApiKey: envArgs.clickupApiKey || process.env.CLICKUP_API_KEY || '',
  clickupTeamId: envArgs.clickupTeamId || process.env.CLICKUP_TEAM_ID || '',
  enableSponsorMessage: process.env.ENABLE_SPONSOR_MESSAGE === 'true' || false,
  sponsorUrl: process.env.SPONSOR_URL || 'https://github.com/sponsors/taazkareem'
};

// Validate only the required variables are present
const requiredVars = ['clickupApiKey', 'clickupTeamId'];
const missingEnvVars = requiredVars
  .filter(key => !configuration[key as keyof Config])
  .map(key => key);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(', ')}`
  );
}

export default configuration;
