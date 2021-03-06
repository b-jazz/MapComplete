import TagRenderingConfig from "./JSON/TagRenderingConfig";
import * as questions from "../assets/tagRenderings/questions.json";
import * as icons from "../assets/tagRenderings/icons.json";

export default class SharedTagRenderings {

    public static SharedTagRendering = SharedTagRenderings.generatedSharedFields();

    private static generatedSharedFields() {
        const dict = {}
        
        
        function add(key, store){
            try {
                dict[key] = new TagRenderingConfig(store[key])
            } catch (e) {
                console.error("BUG: could not parse", key, " from questions.json or icons.json", e)
            }
        }
        
        
        for (const key in questions) {
            add(key, questions);
        }
        for (const key in icons) {
            add(key, icons);
        }
        
        return dict;
    }

}
