import { Injectable } from '@angular/core';
import { Http, Response, RequestOptions,Headers } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import { QuestionWrapper } from '../model/questionWrapper';
import { Question } from '../model/question';
import { Choice } from '../model/choice';
import { CorrectChoice } from '../model/CorrectChoice';
import { QuizUser } from '../model/QuizUser';
import { Category } from '../model/category';

@Injectable()
export class HTTPService {
    private AzureUrl = "";
    options: any;    

    Login(quizUserId, password): any {
        return this.http.get(`${this.AzureUrl}/api/authenticate?userId=${quizUserId}&userPassword=${password}&isAdmin=${true}`,this.options).toPromise().then(this.extractData);
    }

    getAllQuizUsers(): any {
        return this.http.get(`${this.AzureUrl}/api/quizuser`,this.options).toPromise().then(this.extractData);
    }


    constructor(private http: Http) { 
        this.options = new RequestOptions({ headers: new Headers({ 'ZUMO-API-VERSION': '2.0.0' }) });
    }

    /**
     * returns all the questions from the database
     */
    getAllQuestions(){
        return this.http.get(`${this.AzureUrl}/api/question`,this.options).toPromise().then(this.extractData);
    }

    /**
     * returns all the choices from the database
     */
    getAllChoices(){
        return this.http.get(`${this.AzureUrl}/api/choice`,this.options).toPromise().then(this.extractData);
    }

    /**
     * returns all the correctChoices from the database
     */
    getAllCorrectChoices(){
        return this.http.get(`${this.AzureUrl}/api/correctChoice`,this.options).toPromise().then(this.extractData);
    }

    getAllCategories(){
        return this.http.get(`${this.AzureUrl}/api/category`,this.options).toPromise().then(this.extractData);
    }
    
    /**
     * Returns questionWrapper that consisits of Question,Choices and CorrectChoice.
     */
    getAllQuestionWrapper(): Promise<QuestionWrapper[]>  {
        var current = this;
        var questionWrappers = new Array<QuestionWrapper>();
        var questions: Question[];
        var choices: Choice[];
        var correctChoices: CorrectChoice[];

        return new Promise((resolve, reject) => {
            let promises = new Array<Promise<any>>();

            let promise = current.getAllQuestions()
            .then(data => questions = data)
            .catch(this.handleError);

            promises.push(promise);

            promise = current.getAllChoices()
            .then(data => {
                choices = data;
            })
            .catch(this.handleError);

            promises.push(promise);

            promise = current.getAllCorrectChoices()
            .then(data => correctChoices = data)
            .catch(this.handleError);

            promises.push(promise);

            Promise.all(promises).then(function () {
                questions.forEach(element => {
                    console.log(element);
                    var questionWrapper: QuestionWrapper = new QuestionWrapper();
                    questionWrapper.QuestionId = element.QuestionId;
                    questionWrapper.Text = element.Text;
                    questionWrapper.CategoryName = element.CategoryName;
                    questionWrapper.ImageUrl = element.ImageUrl;
                    questionWrapper.choice = choices.filter((el) => el.QuestionId == element.QuestionId);
                    questionWrapper.correctChoice = correctChoices.find((el) => el.QuestionId == questionWrapper.QuestionId);
                    questionWrappers.push(questionWrapper);
                });
                resolve(questionWrappers);
            });
        });

    }

    /**
     * 
     * @param questionWrapper Adds a new wrapper to the database
     * layer 1: Adds question to the database
     * layer 2: It loops for the choices(because there has to be more than 1 choice) and add one by one to the database
     * layer 3: It get the choiceId of the correctChoice and add that to the database.
     */
    addQuestionWrapper(questionWrapper: QuestionWrapper): Promise<QuestionWrapper> 
    {
        return new Promise((resolve, reject) => {
            try {
                this.addQuestion(questionWrapper.Text,questionWrapper.CategoryName,questionWrapper.ImageUrl).then((question) => {
                    console.log(question);
                    questionWrapper.QuestionId = question.QuestionId;
                    let promises = new Array<Promise<any>>();
                    questionWrapper.choice.forEach((element) => {
                        let promise = this.addChoice(questionWrapper.QuestionId,element.Text).then((choice) => {
                            element.ChoiceId = choice.ChoiceId;
                        })
                        promises.push(promise);
                    })
                    Promise.all(promises).then((result) => {
                        questionWrapper.choice.forEach((element) => {
                           if(element.Text == questionWrapper.correctChoiceText){
                               console.log(questionWrapper.QuestionId,element.ChoiceId);
                               this.addCorrectChoice(questionWrapper.QuestionId,element.ChoiceId).then((res) => {
                                    questionWrapper.correctChoice.ChoiceId = element.ChoiceId;
                                    questionWrapper.correctChoice.QuestionId = questionWrapper.QuestionId;
                                    resolve(questionWrapper);
                               })
                           }
                        });
                    })
                })
            } catch (error) {
                throw error;
            }
            
        });
    }

    /**
     * 
     * @param text 
     * @param category 
     * it adds the text and category to the database
     */
    addQuestion(text, category, imageUrl){
        return this.http.post(`${this.AzureUrl}/api/question`,{ Text: text, CategoryName: category, ImageUrl: imageUrl},this.options).toPromise().then(this.extractData);
    }

    addChoice(questionId, text){
        return this.http.post(`${this.AzureUrl}/api/choice`,{ Text: text, QuestionId: questionId},this.options).toPromise().then(this.extractData);
    }

    addUser(user: QuizUser){
        return this.http.post(`${this.AzureUrl}/api/quizuser`,user,this.options).toPromise().then(this.extractData);
    }

    addCategory(category: Category): any {
        return this.http.post(`${this.AzureUrl}/api/category`,category,this.options).toPromise().then(this.extractData);
    }

    /**
     * 
     * @param questionId of which the correct choice is being entered.
     * @param choiceId of which the correct question is being entered.
     */
    addCorrectChoice(questionId, choiceId){
        return this.http.post(`${this.AzureUrl}/api/correctChoice`,{ QuestionId: questionId, ChoiceId: choiceId},this.options).toPromise().then(this.extractData);
    }

    /**
     * 
     * @param questionId the question id that needs to be deleted.
     * It called a HTTP patch method, that contains a JSON object with attributes { questionId: 0, isDelete: true}.
     * @example httpService.deleteQuestion(1).then((data) => { console.log("deleted Succesfully")});
     */
    deleteQuestion(questionId){
        return this.http.patch(`${this.AzureUrl}/api/question`,{ QuestionId: questionId, IsDelete: true},this.options).toPromise().then(this.extractData);
    }

    deleteUser(userId){
        return this.http.delete(`${this.AzureUrl}/api/quizUser?QuizUserId=${userId}`,this.options).toPromise().then(this.extractData);
    }

    deleteCategory(categoryName: any): any {
        return this.http.delete(`${this.AzureUrl}/api/category?CategoryName=${categoryName}`,this.options).toPromise().then(this.extractData);
    }

    private extractData(res: Response) {
        let body = res.json();
        console.log(body);
        return body || {};
    }

    private handleError(error: any): Promise<any> {
        console.error('An error occurred', error);
        return Promise.reject(error.message || error);
    }
    
}