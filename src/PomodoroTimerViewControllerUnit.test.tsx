import React from "react"
import { Observable, Subject } from "rxjs"
import '@testing-library/jest-native/extend-expect'
import { render, fireEvent, act, cleanup } from '@testing-library/react-native'
import { ReactTestInstance } from "react-test-renderer"
import { MinutesSeconds } from "./PomodoroTimerViewModel"
import CountdownTimerInterface from './CountdownTimerInterface'
import PomodoroTimerViewController from './PomodoroTimerViewController'
import PomodoroStateChangeInterface, { PomodoroState } from './PomodoroStateChangeInterface'
import { TouchableHighlight } from "react-native-gesture-handler";


type TestingQueryResults = ReactTestInstance|Array<ReactTestInstance>|null;
function findAnyByProps(node: ReactTestInstance, props: {[propName: string]: any}): TestingQueryResults{
    const result = node.findAllByProps(props);
    if(result.length == 0) return null;
    if(result.length == 1) return result[0];
    return result;
}
function findAnyByName(node: ReactTestInstance, name: string): TestingQueryResults{
    return findAnyByProps(node, {'name': name});
}
function findAnyByTestID(node: ReactTestInstance, testID: string): TestingQueryResults{
    return findAnyByProps(node, {'testID': testID});
}
function isObject(subject:any){
    if(Array.isArray(subject)) return false;
    return subject !== null;
}

describe('PomodoroTimerView', () => {

    afterEach(() => cleanup())

    it('test run toggle reset update', async () => {
        const iconNameStart = 'controller-play'
        const iconNamePause = 'controller-paus'
        const iconNameReset = 'ccw'

        const stateObject = new DummyState()
        const timerObject = new DummyTimer()
        const vc = <PomodoroTimerViewController
            countdownTimer={timerObject}
            pomodoroState={stateObject}
        />        
        const ren = render(vc)
        const root = ren.container

        // fetch and check timer control buttons
        const buttonRun = findAnyByTestID(root, 'run_button') as ReactTestInstance
        expect(isObject(buttonRun)).toBeTruthy()
        const buttonReset = findAnyByTestID(root, 'reset_button') as ReactTestInstance
        expect(isObject(buttonReset)).toBeTruthy()

        // should have reset and start
        expect(findAnyByName(root, iconNameReset)).not.toBeNull()
        expect(findAnyByName(root, iconNameStart)).not.toBeNull()
        expect(findAnyByName(root, iconNamePause)).toBeNull()

        // simulate press reset
        timerObject.resetTimer=jest.fn()
        await fireEvent(buttonReset.findByType(TouchableHighlight), 'onPress')
        await expect(timerObject.resetTimer).toBeCalledTimes(1)

        // simulate press start
        timerObject.startTimer=jest.fn()
        await fireEvent(buttonRun.findByType(TouchableHighlight), 'onPress')
        await expect(timerObject.startTimer).toBeCalledTimes(1)
        await act(async ()=>{
            timerObject.isRunning = true
            timerObject.onTimerToggleSubject.next(timerObject)
        })
        
        // should be set to pause
        await expect(findAnyByName(root, iconNameStart)).toBeNull()
        await expect(findAnyByName(root, iconNamePause)).not.toBeNull()

        // simulate press pause
        timerObject.pauseTimer=jest.fn()
        await fireEvent(buttonRun.findByType(TouchableHighlight), 'onPress')
        await expect(timerObject.pauseTimer).toBeCalledTimes(1)
        await act(async ()=>{
            timerObject.isRunning = false
            timerObject.onTimerToggleSubject.next(timerObject)
        })

        // should be set to start
        await expect(findAnyByName(ren.container, iconNameStart)).not.toBeNull()
        await expect(findAnyByName(ren.container, iconNamePause)).toBeNull()

        // simulate press start
        timerObject.startTimer=jest.fn()
        await fireEvent(buttonRun.findByType(TouchableHighlight), 'onPress')
        await expect(timerObject.startTimer).toBeCalledTimes(1)
        await act(async ()=>{
            timerObject.isRunning = true
            timerObject.onTimerToggleSubject.next(timerObject)
        })

        // should be set to pause
        await expect(findAnyByName(root, iconNameStart)).toBeNull()
        await expect(findAnyByName(root, iconNamePause)).not.toBeNull()

        // simulate timer finishing
        await act(async ()=>{
            timerObject.isRunning = false
            timerObject.onTimerFinishSubject.next(timerObject)
        })
        
        // should be set to start
        await expect(findAnyByName(ren.container, iconNameStart)).not.toBeNull()
        await expect(findAnyByName(ren.container, iconNamePause)).toBeNull()
    })

    it('test time display', async () => {
        const timerObject = new DummyTimer()
        const vc = <PomodoroTimerViewController
            countdownTimer={timerObject}
            pomodoroState={new DummyState()}
        />
        const ren = render(vc);

        // clock items should update automatically
        const minutesLabel = await ren.queryByTestId('minutes_label')
        const secondsLabel = await ren.queryByTestId('seconds_label')
        await act(async()=>{
            timerObject.time = new MinutesSeconds(25, 0);
            timerObject.onTimerUpdateSubject.next(timerObject);
        })
        expect(minutesLabel).toHaveTextContent('25');
        expect(secondsLabel).toHaveTextContent('00');

        await act(async()=>{
            timerObject.time = new MinutesSeconds(2, 45);
            timerObject.onTimerUpdateSubject.next(timerObject);
        })
        expect(minutesLabel).toHaveTextContent('02');
        expect(secondsLabel).toHaveTextContent('45');
    })

    class DummyTimer implements CountdownTimerInterface<MinutesSeconds>{
        readonly onTimerUpdateSubject = new Subject<DummyTimer>();
        readonly onTimerToggleSubject = new Subject<DummyTimer>();
        readonly onTimerFinishSubject = new Subject<DummyTimer>();
        time = new MinutesSeconds(0, 0);
        isRunning = false;
        onCountdownUpdate(): Observable<any> {
            return this.onTimerUpdateSubject.asObservable();
        }
        onCountdownToggle(): Observable<DummyTimer> {
            return this.onTimerToggleSubject.asObservable();
        }
        onCountdownFinish(): Observable<any> {
            return this.onTimerFinishSubject.asObservable();
        }
        getCurrentTime(): MinutesSeconds {
            return this.time;
        }
        isTimerRunning(): boolean {
            return this.isRunning;
        }

        // implement inside tests
        startTimer(): void {throw new Error("Method not implemented.");}
        pauseTimer(): void {throw new Error("Method not implemented.");}
        resetTimer(): void {throw new Error("Method not implemented.");}
    };

    class DummyState implements PomodoroStateChangeInterface{
        onPomodoroStateChange(): Observable<PomodoroStateChangeInterface> {
            throw new Error("Method not implemented.");}
        getPomodoroState(): PomodoroState {
            throw new Error("Method not implemented.");}
        skipPomodoroState(): void {
            throw new Error("Method not implemented.");}
    };
})