import {
    IAppAccessors,
    IConfigurationExtend,
    IHttp,
    IModify,
    IPersistence,
    IRead,
} from '@rocket.chat/apps-engine/definition/accessors';
import { App } from '@rocket.chat/apps-engine/definition/App';
import { ILogger } from '@rocket.chat/apps-engine/definition/accessors';
import { IAppInfo } from '@rocket.chat/apps-engine/definition/metadata';
import {
    IUIKitResponse,
    UIKitActionButtonInteractionContext,
} from '@rocket.chat/apps-engine/definition/uikit';
import { UIActionButtonContext } from '@rocket.chat/apps-engine/definition/ui';

export class SocialHubApp extends App {
    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
    }

    public async extendConfiguration(configuration: IConfigurationExtend): Promise<void> {
        // Register a button in the top navigation bar (user menu area)
        await configuration.ui.registerButton({
            actionId: 'social-hub-nav',
            labelI18n: 'social_hub_button',
            context: UIActionButtonContext.USER_DROPDOWN_ACTION,
        });

        // Also add a button in the room header for easy access
        await configuration.ui.registerButton({
            actionId: 'social-hub-redirect',
            labelI18n: 'social_hub_button',
            context: UIActionButtonContext.ROOM_ACTION,
        });

        // Add a button in the message box for easy access
        await configuration.ui.registerButton({
            actionId: 'social-hub-message-box',
            labelI18n: 'social_hub_open',
            context: UIActionButtonContext.MESSAGE_BOX_ACTION,
        });
    }

    public async executeActionButtonHandler(
        context: UIKitActionButtonInteractionContext,
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify,
    ): Promise<IUIKitResponse> {
        const actionId = context.getInteractionData().actionId;
        
        if (actionId === 'social-hub-nav') {
            // For navigation button, redirect directly without posting a message
            try {
                const socialHubUrl = 'http://localhost:8080/feed'; // Your local Social Hub URL
                // Return a success response with URL data
                return context.getInteractionResponder().successResponse();
            } catch (error) {
                this.getLogger().error('Error opening Social Hub URL:', error);
            }
        } else if (actionId === 'social-hub-redirect' || actionId === 'social-hub-message-box') {
            const user = context.getInteractionData().user;
            const room = context.getInteractionData().room;
            
            // Create a clickable link that opens in new tab
            try {
                const socialHubUrl = 'http://localhost:8080/feed'; // Your local Social Hub URL
                const messageBuilder = modify.getCreator().startMessage()
                    .setText(`🚀 **Social Hub**\n\n[Click here to open Social Hub](${socialHubUrl})`)
                    .setRoom(room)
                    .setSender(user);
                    
                await modify.getCreator().finish(messageBuilder);
            } catch (error) {
                this.getLogger().error('Error sending Social Hub link:', error);
            }
        }

        return context.getInteractionResponder().successResponse();
    }
}