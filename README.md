# Tribe BRP linker

An application that allows for checking information from the BRP, and optionally 
appending some information to the Tribe CRM application.

## Authentication
Authentication is done via oAuth2, authentication with the Tribe CRM application. This
ensures all actions are attributed to the correct user in Tribe, and access is only allowed
for those users.

## linking to Tribe
This application is configured specifically for the way Tribe is configured for our servicedesk. 
Several parameters are set to hardcoded configuration-specific UUIDs, which means the application
is not useable in different Tribe installs without modification.