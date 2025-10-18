"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocialHubApp = void 0;
const App_1 = require("@rocket.chat/apps-engine/definition/App");
const ui_1 = require("@rocket.chat/apps-engine/definition/ui");
class SocialHubApp extends App_1.App {
    constructor(info, logger, accessors) {
        super(info, logger, accessors);
    }
    async extendConfiguration(configuration) {
        await configuration.ui.registerButton({
            actionId: 'social-hub-nav',
            labelI18n: 'social_hub_button',
            context: ui_1.UIActionButtonContext.USER_DROPDOWN_ACTION,
        });
        await configuration.ui.registerButton({
            actionId: 'social-hub-redirect',
            labelI18n: 'social_hub_button',
            context: ui_1.UIActionButtonContext.ROOM_ACTION,
        });
        await configuration.ui.registerButton({
            actionId: 'social-hub-message-box',
            labelI18n: 'social_hub_open',
            context: ui_1.UIActionButtonContext.MESSAGE_BOX_ACTION,
        });
    }
    async executeActionButtonHandler(context, read, http, persistence, modify) {
        const actionId = context.getInteractionData().actionId;
        if (actionId === 'social-hub-nav') {
            try {
                const socialHubUrl = 'http://localhost:8080/feed';
                return context.getInteractionResponder().successResponse();
            }
            catch (error) {
                this.getLogger().error('Error opening Social Hub URL:', error);
            }
        }
        else if (actionId === 'social-hub-redirect' || actionId === 'social-hub-message-box') {
            const user = context.getInteractionData().user;
            const room = context.getInteractionData().room;
            try {
                const socialHubUrl = 'http://localhost:8080/feed';
                const messageBuilder = modify.getCreator().startMessage()
                    .setText(`🚀 **Social Hub**\n\n[Click here to open Social Hub](${socialHubUrl})`)
                    .setRoom(room)
                    .setSender(user);
                await modify.getCreator().finish(messageBuilder);
            }
            catch (error) {
                this.getLogger().error('Error sending Social Hub link:', error);
            }
        }
        return context.getInteractionResponder().successResponse();
    }
}
exports.SocialHubApp = SocialHubApp;
