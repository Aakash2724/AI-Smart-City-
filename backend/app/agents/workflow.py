from app.agents.state import ComplaintState
from app.agents.classification_agent import classification_agent
from app.agents.priority_agent import priority_agent
from app.agents.routing_agent import routing_agent
from app.agents.response_agent import response_agent

class MultiAgentWorkflow:
    """
    Orchestrates the 4-stage Multi-Agent Municipal Complaint Pipeline:
    1. Classification Agent -> Categorizes issue from text & vision
    2. Priority Agent       -> Computes 5-factor urgency score & SLA timeline
    3. Routing Agent        -> Assigns designated department & zonal officer
    4. Response Agent       -> Drafts citizen feedback & government work order
    """
    def run(self, initial_state: ComplaintState) -> ComplaintState:
        state = classification_agent.execute(initial_state)
        state = priority_agent.execute(state)
        state = routing_agent.execute(state)
        state = response_agent.execute(state)
        return state

multi_agent_workflow = MultiAgentWorkflow()
