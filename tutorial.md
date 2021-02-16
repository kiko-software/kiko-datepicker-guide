# Integrate a custom datepicker
## Introduction
With the Kiko software you can create a chatbot that replaces your online forms - https://www.kiko.bot 
You can define the behaviour of the form dialogue yourself using an external subbot and web service. 
You can use your own data types and control elements in the webchat.

In this tutorial you will get to know an example of a form dialogue with a custom date picker.
The sample code is based on nodejs and uses a Firestore database from Google to temporarily store the form data. 
The web service can be hosted at e.g. Google Cloud Run.

## General process
For a form dialogue in Kiko Webchat with its own date picker, settings are made in three places.

1. Example webpage
The Kiko webchat is integrated on an individual page with a code snippet. 
In addition, there is the external Datepicker library. 
Another code snippet monitors all incoming chatbot messages. The datepicker is displayed when a datepicker feature is found in a form dialogue message.

2. Kiko chatbot
A chatbot is created in the Kiko CMS and integrated on your own website as a widget. Users are welcomed there by the chatbot and can be redirected to the intent with the form dialogue. 
In this intent, all form fields are defined as well as a template for the final response text.
Here, the user input is also forwarded to the web services of an external subbot, which takes over the individual flow control of the form dialogue. 
When the external subbot has collected all the required data and sent it for processing, it returns the control to the chatbot.

3. Webservice of the external subbot
It is the task of the web service to successively ask the user those questions that are necessary for filling out a form. 
The user's form answers are to be saved until the form dialogue is completed.
If a form field is of the type date, the display of the date picker is to be triggered. 
At the end of the form dialogue, all collected data is transferred to another web service or to an employee for later answering. However, it is also possible that the final answer for the user is already calculated with this data.

## Look at the code

### src/index.js

The processing of the subbot request from the Kiko server takes place in the file src/index.js.

At the beginning the web server is initialised.

The route "/v1/ping" is only there for test purposes.
The route "/v1/webhook-message-sent" is entered in the webhook of the subbot.
The route "src/public" is there for the static example website.

### src/functions.js

### postWebhookMessageSent
Once the form intent is detected, all user messages are sent to the subbot web service and the function "postWebhookMessageSent".
 
This function evaluates, among other things, the metadata that is stored as JSON in the CMS for the intention. The request can be forwarded to another sub-function via the "action" property. The assignment is configured in the object "actionToFunctionMapping".

The action "echo" is used for test purposes.
The action "date-picker-dialog" calls the function "runDatePickerDialog".

### runDatePickerDialog
In this function, the parameters are passed through which are defined in the metadata of the intent.
User input can be validated here. The flow control of the dialogue can be controlled dynamically.

As soon as the data type "@sys.date" is recognised in the form values, the function sends an additional message to the webchat with an HTML DIV element with the ID 'mydatepicker'. Furthermore, the preselected date can be passed.

After form data has been collected in the variable "newFormSessionData.content", it can be forwarded to another web service or to an email address for processing.

As a response, the user is simply given the result text from "metadata.intent.output" stored in the intent.

## Test
If you have nodejs installed on your environment (version>=12), you can test the web service locally.

Please use the Google Cloud Shell Editor or the IDE Visual Studio Code for the following steps.

Open a first terminal, go to the web service folder and install the service.
```console
npm install
```

Start the web service.
```console
npm run start
```
Expected output: "The container started successfully on port 8080"

## Deploy
Use the cloud-code cloud-run extension of your code editor.
- Click "Cloud Code" in the footer of the editor.
- Click "Deploy to Cloud Run".
- Choose your preferred region and click "Deploy".
- Use the result URL i.e.: URL: https://kiko-datepicker-guide-....a.run.app as your external subbot web service endpoint URL.

## Kiko Integration
- Create your own Kiko CMS account: https://www.kiko.bot/kostenlos-registrieren-chatbot-cms/
- Create an external subbot with the name "subbot-datepicker" in the CMS via the menu "Botlist". 
- Enter the URL of the published web service in the subbot via the submenu item "Edit webhooks" in the field "Receive message": https://kiko-datepicker-guide-....a.run.app/v1/webhook-message-sent
- Create an intent with the name "Datepicker form dialog" via the "Content" menu in the "metabot" enter "subbot-datepicker" as the subbot's forwarding.
- Enter the text value "Form sent." in "Content" under "Result".
- For recognition, create the entity type "topic" with the entity value "datepicker".
- Enter the following value in "Flow control" under "Metadata for external subbot"
```json
{
"action":"date-picker-dialog",
"parameters": [
    {
      "name": "date-field-01",
      "question": "Wie lautet das Datum",
      "dataType": "@sys.date"
    }, 
    {
      "name": "text-field-02",
      "question": "Wie lautet der Titel 02",
      "dataType": "@sys.any"
    }
  ]
}
```
- Leave the field "Query parameters" deactivated.
- Publish the bot with the intent and the external subbot via the menu "Botlist"

## Test
For the test, we need the sample web page mentioned above with the included library for the datepicker:
https://kiko-datepicker-guide-....a.run.app/index.html
In order to address the correct chatbot in your account, we need two more parameters
- the domain name of the Kiko CMS instance - e.g. "cloud02-7c83ec0.prod.1000grad.de" and
- the bot identifier of the metabot - from "Botlist" / "Edit Bot" / "Identifier" - e.g. "6d5abc25-6110-31fa-87a2-77cd2422c3d5". 

The URL for a test call in the browser in this example is:

https://kiko-datepicker-guide-....a.run.app/index.html?botCmsKey=cloud02-7c83ec0.prod.1000grad.de&botIdentifier=6d5abc25-6110-31fa-87a2-77cd2422c3d5

When entering "datepicker" in the chat at the bottom right, a form dialog with a datepicker should now appear.
